import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { createTestDatabase } from "./helpers/test-database";

describe("migrations on a real PostgreSQL engine (PGlite)", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  before(async () => {
    database = await createTestDatabase();
  });
  after(() => database.close());

  const q = (sql: string) => database.client.query<Record<string, unknown>>(sql);
  const fails = async (sql: string, pattern: RegExp) => {
    await assert.rejects(q(sql), (error: Error) => {
      assert.match(error.message, pattern);
      return true;
    });
  };

  test("all four migrations are recorded, and a second run applies nothing", async () => {
    assert.equal((await q("select count(*)::int as n from drizzle.__drizzle_migrations")).rows[0].n, 4);
    await database.migrate();
    assert.equal((await q("select count(*)::int as n from drizzle.__drizzle_migrations")).rows[0].n, 4);
  });

  test("the HOME page is seeded once", async () => {
    const rows = (await q("select key, title from pages")).rows;
    assert.deepEqual(rows, [{ key: "HOME", title: "Home" }]);
  });

  test("the new columns exist", async () => {
    const columns = (
      await q(`select table_name || '.' || column_name as c from information_schema.columns
               where table_schema = 'public' and column_name in
               ('role','runtime','preview_media_id','content','is_hidden','page_id','parent_block_id',
                'poster_media_id','checksum_sha256','alt_text')`)
    ).rows.map((r) => r.c);
    for (const c of [
      "projects.role",
      "projects.runtime",
      "projects.preview_media_id",
      "project_blocks.content",
      "project_blocks.is_hidden",
      "project_blocks.page_id",
      "project_blocks.parent_block_id",
      "media.poster_media_id",
      "media.checksum_sha256",
      "block_media.alt_text",
      "block_media.poster_media_id",
    ]) {
      assert.ok(columns.includes(c), `missing ${c}`);
    }
  });

  test("a block has exactly one owner (ADR-0007, ADR-0013)", async () => {
    const project = (await q("insert into projects (title, slug) values ('P', 'p') returning id")).rows[0].id;
    const home = (await q("select id from pages where key = 'HOME'")).rows[0].id;
    await fails("insert into project_blocks (type, position) values ('TEXT', 0)", /single_owner/);
    await fails(
      `insert into project_blocks (project_id, page_id, type, position) values ('${project}', '${home}', 'TEXT', 0)`,
      /single_owner/,
    );
    const grid = (
      await q(`insert into project_blocks (project_id, type, position) values ('${project}', 'GRID', 0) returning id`)
    ).rows[0].id;
    // A child names only its parent.
    await fails(
      `insert into project_blocks (project_id, parent_block_id, type, position) values ('${project}', '${grid}', 'TEXT', 0)`,
      /single_owner/,
    );
    await q(`insert into project_blocks (parent_block_id, type, position) values ('${grid}', 'TEXT', 0)`);
  });

  test("GRID children are leaves: no GRID or GALLERY inside a GRID (ADR-0006)", async () => {
    const grid = (await q("select id from project_blocks where type = 'GRID' limit 1")).rows[0].id;
    await fails(`insert into project_blocks (parent_block_id, type, position) values ('${grid}', 'GRID', 1)`, /leaf_child/);
    await fails(`insert into project_blocks (parent_block_id, type, position) values ('${grid}', 'GALLERY', 1)`, /leaf_child/);
  });

  test("a poster cannot be its asset, and content checksums are unique among live assets (ADR-0009, ADR-0014)", async () => {
    const a = (await q("insert into media (type, checksum_sha256) values ('VIDEO', repeat('a', 64)) returning id")).rows[0].id;
    await fails(`update media set poster_media_id = '${a}' where id = '${a}'`, /poster_not_self/);
    await fails("insert into media (type, checksum_sha256) values ('IMAGE', repeat('a', 64))", /checksum_active/);
    await fails("insert into media (type, checksum_sha256) values ('IMAGE', 'not-a-checksum')", /checksum_format/);
    // A soft-deleted asset no longer claims its checksum.
    await q(`update media set deleted_at = now() where id = '${a}'`);
    await q("insert into media (type, checksum_sha256) values ('VIDEO', repeat('a', 64))");
  });

  test("an image used as a poster cannot be hard-deleted", async () => {
    const image = (await q("insert into media (type) values ('IMAGE') returning id")).rows[0].id;
    await q(`insert into media (type, poster_media_id) values ('VIDEO', '${image}')`);
    await fails(`delete from media where id = '${image}'`, /poster_media_id_fkey/);
  });

  test("an image used as a placement poster cannot be hard-deleted (ADR-0015)", async () => {
    const project = (await q("insert into projects (title, slug) values ('Q', 'q') returning id")).rows[0].id;
    const block = (
      await q(`insert into project_blocks (project_id, type, position) values ('${project}', 'VIDEO', 0) returning id`)
    ).rows[0].id;
    const video = (await q("insert into media (type) values ('VIDEO') returning id")).rows[0].id;
    const still = (await q("insert into media (type) values ('IMAGE') returning id")).rows[0].id;
    await q(`insert into block_media (block_id, media_id, position, poster_media_id) values ('${block}', '${video}', 0, '${still}')`);
    await fails(`delete from media where id = '${still}'`, /block_media_poster_media_id_fkey/);
  });
});
