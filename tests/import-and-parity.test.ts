import assert from "node:assert/strict";
import { resolve } from "node:path";
import { after, before, describe, test } from "node:test";
import { createMediaRepository } from "@/features/media/media.repository";
import { createDbGateway } from "@/features/site-content/db-gateway";
import { ContentProjectionError } from "@/features/site-content/db-projection";
import type { ContentGateway } from "@/features/site-content/site-content.types";
import { staticGateway } from "@/features/site-content/static-gateway";
import { mediaKeyFromUrl } from "@/lib/storage/media-url";
import { applyImportPlan, buildImportPlan, type ImportPlan } from "../scripts/lib/static-import";
import { createTestDatabase } from "./helpers/test-database";

// Replaces every media URL with the SHA-256 of the file it serves, so that the
// comparison is by content: deduplication legitimately serves a shared asset
// from one copy's URL.
function byContent(value: unknown, plan: ImportPlan): unknown {
  if (typeof value === "string") {
    const key = mediaKeyFromUrl(value);
    const file = key ? plan.inventory.files.get(key) : undefined;
    return file?.exists ? `sha256:${file.sha256}` : value;
  }
  if (Array.isArray(value)) return value.map((v) => byContent(v, plan));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, byContent(v, plan)]));
  }
  return value;
}

function diffs(a: unknown, b: unknown, path = ""): string[] {
  if (Object.is(a, b)) return [];
  if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) !== Array.isArray(b)) {
    return [path || "(root)"];
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].flatMap((k) =>
    diffs((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], path ? `${path}.${k}` : k),
  );
}

describe("static content → database: import and adapter parity", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let plan: ImportPlan;
  let db: ContentGateway;
  const q = (sql: string) => database.client.query<Record<string, unknown>>(sql);
  const count = async (table: string) => (await q(`select count(*)::int as n from ${table}`)).rows[0].n;

  before(async () => {
    database = await createTestDatabase();
    plan = await buildImportPlan(staticGateway, resolve("public/media"));
    db = createDbGateway(database.db);
  });
  after(() => database.close());

  test("the plan is complete, verified and deduplicated", () => {
    assert.deepEqual(plan.issues, []);
    assert.equal(plan.inventory.missing.length, 0);
    assert.equal(plan.inventory.dimensionMismatches.length, 0);
    assert.equal(plan.inventory.files.size, 48);
    assert.equal(plan.assets.length, 22);
    assert.equal(plan.projects.length, 9);
  });

  test("a dry run reads the database and writes nothing", async () => {
    const report = await applyImportPlan(database.db, plan, false);
    assert.equal(report.written, false);
    assert.ok(report.created > 0);
    assert.equal(await count("media"), 0);
    assert.equal(await count("projects"), 0);
  });

  test("apply creates every asset, poster, project and composition once", async () => {
    const report = await applyImportPlan(database.db, plan, true);
    assert.deepEqual(report.drift, []);
    // 22 assets + 7 posters + 9 projects + 1 project composition + HOME.
    assert.equal(report.created, 40);
    assert.equal(await count("media"), 22);
    assert.equal(await count("projects"), 9);
    assert.equal(await count("project_blocks"), 26);
    // Project: hero, 4 stills, loop, coda. Home: hero, 9 wall cells, portrait, 4 coda images.
    assert.equal(await count("block_media"), 22);
  });

  test("a second apply is a no-op", async () => {
    const report = await applyImportPlan(database.db, plan, true);
    assert.equal(report.created, 0);
    assert.deepEqual(report.drift, []);
    assert.equal(await count("media"), 22);
    assert.equal(await count("project_blocks"), 26);
  });

  test("Art Works and every Project Detail page match the static adapter", async () => {
    assert.deepEqual(await db.listPublicProjectSlugs(), await staticGateway.listPublicProjectSlugs());
    assert.deepEqual(diffs(byContent(await db.getWorksIndex(), plan), byContent(await staticGateway.getWorksIndex(), plan)), []);
    for (const slug of await staticGateway.listPublicProjectSlugs()) {
      const [fromDb, fromStatic] = [await db.getProjectPage(slug), await staticGateway.getProjectPage(slug)];
      assert.deepEqual(diffs(byContent(fromDb, plan), byContent(fromStatic, plan)), [], slug);
    }
    assert.equal(await db.getProjectPage("nope"), null);
  });

  test("Home matches the static adapter, including the placement poster override", async () => {
    // n3.mp4's default poster is the project's (mtm-mannequin); Home's fourth
    // wall cell carries its own (mtm-table) as a placement override (ADR-0015).
    assert.deepEqual(diffs(byContent(await db.getHome(), plan), byContent(await staticGateway.getHome(), plan)), []);
    const override = await q("select count(*)::int as n from block_media where poster_media_id is not null");
    assert.equal(override.rows[0].n, 1);
  });

  test("every imported asset is in use, through every kind of reference (CLAUDE.md §12, ADR-0015)", async () => {
    const repository = createMediaRepository(database.db);
    const idOf = async (key: string) => (await q(`select id from media where storage_key = '${key}'`)).rows[0].id as string;
    const kinds = async (key: string) => (await repository.findUsages(await idOf(key))).map((u) => u.kind).sort();

    for (const { id } of (await q("select id from media")).rows) {
      assert.ok((await repository.findUsages(id as string)).length > 0, `${id} has no usage`);
    }
    // n3.mp4's default poster, and the still Home's wall shows over it instead.
    const n3 = await idOf("home/n3.mp4");
    const [defaultPoster] = (await q(`select poster_media_id as id from media where id = '${n3}'`)).rows;
    const override = (await q("select poster_media_id as id, block_id from block_media where poster_media_id is not null")).rows[0];
    assert.deepEqual(
      (await repository.findUsages(defaultPoster.id as string)).map((u) => u.kind).sort(),
      ["ASSET_POSTER", "BLOCK_MEDIA"],
    );
    const overrideUsages = await repository.findUsages(override.id as string);
    assert.ok(overrideUsages.some((u) => u.kind === "PLACEMENT_POSTER" && u.pageKey === "HOME" && u.blockId === override.block_id));
    assert.deepEqual(await kinds("home/n3.mp4"), ["BLOCK_MEDIA", "BLOCK_MEDIA", "PROJECT_PREVIEW"]);

    // A soft-deleted project's references no longer hold an asset.
    const cover = (await q("select cover_media_id as id from projects where slug = 'court'")).rows[0].id as string;
    await q("update projects set deleted_at = now() where slug = 'court'");
    try {
      assert.ok(!(await repository.findUsages(cover)).some((u) => u.kind === "PROJECT_COVER"));
    } finally {
      await q("update projects set deleted_at = null where slug = 'court'");
    }
  });

  test("About and Contact stay static", async () => {
    assert.deepEqual(await db.getAbout(), await staticGateway.getAbout());
    assert.deepEqual(await db.getContact(), await staticGateway.getContact());
  });

  test("drafts, soft-deleted and PRIVATE projects never appear publicly (CLAUDE.md §17.1)", async () => {
    await q("update projects set status = 'DRAFT' where slug = 'court'");
    await q("update projects set deleted_at = now() where slug = 'lacing'");
    await q("update projects set visibility = 'PRIVATE', password_hash = 'x' where slug = 'sketch'");
    try {
      const slugs = await db.listPublicProjectSlugs();
      for (const hidden of ["court", "lacing", "sketch"]) {
        assert.ok(!slugs.includes(hidden), hidden);
        assert.equal(await db.getProjectPage(hidden), null, hidden);
      }
      const works = await db.getWorksIndex();
      assert.ok(!JSON.stringify(works).match(/court|lacing|sketch/i));
      // The next project skips what is not listed.
      assert.equal((await db.getProjectPage("made-to-measure"))?.next.slug, "the-desk");
    } finally {
      await q("update projects set status = 'PUBLISHED' where slug = 'court'");
      await q("update projects set deleted_at = null where slug = 'lacing'");
      await q("update projects set visibility = 'PUBLIC', password_hash = null where slug = 'sketch'");
    }
  });

  test("hidden blocks never appear, at any level (CLAUDE.md §17.18)", async () => {
    const coda = `(select id from project_blocks where type = 'IMAGE' and config->>'preset' = 'projectCoda')`;
    const still = `(select b.id from project_blocks b join project_blocks g on g.id = b.parent_block_id
                    where g.config->>'preset' = 'projectStills' order by b.position limit 1)`;
    await q(`update project_blocks set is_hidden = true where id in (${coda}, ${still})`);
    try {
      const detail = (await db.getProjectPage("made-to-measure"))?.detail;
      assert.equal(detail?.coda, undefined);
      assert.equal(detail?.stills.length, 3);
    } finally {
      await q("update project_blocks set is_hidden = false");
    }
  });

  test("a composition the locked page cannot render is refused, not reshuffled", async () => {
    const stills = `(select id from project_blocks where config->>'preset' = 'projectStills')`;
    const coda = `(select id from project_blocks where config->>'preset' = 'projectCoda')`;
    await q(`update project_blocks set position = 99 where id = ${coda}`);
    await q(`update project_blocks set position = 100 where id = ${stills}`);
    try {
      await assert.rejects(db.getProjectPage("made-to-measure"), ContentProjectionError);
    } finally {
      await q(`update project_blocks set position = 2 where id = ${stills}`);
      await q(`update project_blocks set position = 5 where id = ${coda}`);
    }
    assert.ok((await db.getProjectPage("made-to-measure"))?.detail?.coda);
  });

  test("stored JSON that fails the block contract is refused on read", async () => {
    const hero = `(select id from project_blocks where type = 'HERO' and project_id is not null)`;
    await q(`update project_blocks set config = config || '{"color": "#c4361c"}' where id = ${hero}`);
    try {
      await assert.rejects(db.getProjectPage("made-to-measure"), /color/);
    } finally {
      await q(`update project_blocks set config = config - 'color' where id = ${hero}`);
    }
  });
});
