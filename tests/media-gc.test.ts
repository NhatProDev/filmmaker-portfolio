import "./helpers/access-secret";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { planMediaGc, readGcReferences, type GcInput, type GcRow } from "../scripts/lib/media-gc";
import { createLocalMediaStorage, createS3MediaStorage, type ListedObject } from "@/lib/storage/media-storage";
import { createApiTestContext } from "./helpers/api";

// Phase 3D-13: the media lifecycle audit never names an object that anything
// could still need, and its report is deterministic.

const NOW = new Date("2026-09-25T00:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
const object = (key: string, days: number, audience: ListedObject["audience"] = key.startsWith("private/") ? "private" : "public"): ListedObject => ({
  audience,
  key,
  byteSize: 10,
  lastModified: daysAgo(days),
});
const row = (id: string, storageKey: string, extra: Partial<GcRow> = {}): GcRow => ({
  id,
  status: "READY",
  storageKey,
  urlKeys: [],
  deletedAt: null,
  updatedAt: daysAgo(90),
  createdAt: daysAgo(90),
  ...extra,
});
const base = (overrides: Partial<GcInput>): GcInput => ({
  objects: [],
  rows: [],
  referencedMediaIds: new Set(),
  documents: [],
  staticKeys: new Set(),
  now: NOW,
  graceDays: 30,
  abandonedHours: 48,
  ...overrides,
});

describe("media GC planning", () => {
  test("only unreferenced, old objects are candidates; every kind of reference keeps an object", () => {
    const report = planMediaGc(
      base({
        objects: [
          object("originals/live/a.jpg", 100),
          object("originals/gone-but-used/a.jpg", 100),
          object("originals/gone/a.jpg", 100),
          object("originals/gone-recently/a.jpg", 100),
          object("works/static.jpg", 100),
          object("originals/in-snapshot/a.jpg", 100),
          object("originals/nobody/old.jpg", 100),
          object("originals/nobody/new.jpg", 2),
          object("private/originals/abandoned/a.mp4", 10),
          object("private/originals/uploading-now/a.mp4", 0),
          object("_probe/x.txt", 1),
          object("private/leaked.jpg", 100, "public"),
          object("originals/legacy/thumb.jpg", 100),
        ],
        rows: [
          row("live", "originals/live/a.jpg"),
          row("used", "originals/gone-but-used/a.jpg", { deletedAt: daysAgo(60) }),
          row("gone", "originals/gone/a.jpg", { deletedAt: daysAgo(60) }),
          row("recent", "originals/gone-recently/a.jpg", { deletedAt: daysAgo(3) }),
          row("abandoned", "private/originals/abandoned/a.mp4", { status: "UPLOADING", createdAt: daysAgo(10) }),
          row("uploading", "private/originals/uploading-now/a.mp4", { status: "UPLOADING", createdAt: NOW }),
          row("legacy", "originals/legacy/a.jpg", { urlKeys: ["originals/legacy/thumb.jpg"] }),
        ],
        referencedMediaIds: new Set(["used"]),
        documents: ['{"src":"https://cdn/originals/in-snapshot/a.jpg"}'],
        staticKeys: new Set(["works/static.jpg"]),
      }),
    );
    assert.deepEqual(
      report.candidates.map((c) => [c.key, c.reason]),
      // Sorted by audience ("private" before "public"), then key.
      [
        ["private/originals/abandoned/a.mp4", "ABANDONED_UPLOAD"],
        ["_probe/x.txt", "PROBE"],
        ["originals/gone/a.jpg", "DELETED_ASSET"],
        ["originals/nobody/old.jpg", "ORPHAN"],
      ],
    );
    assert.deepEqual(report.summary.kept, { LIVE_ASSET: 3, REFERENCED_ASSET: 1, DOCUMENT: 1, STATIC_CONTENT: 1, RECENT: 2, MISPLACED: 1 });
    assert.deepEqual(report.abandonedRows.map((r) => r.id), ["abandoned"]);
    assert.deepEqual(report.attention.map((a) => [a.key, a.reason]), [
      ["originals/gone-recently/a.jpg", "RECENT"],
      ["originals/nobody/new.jpg", "RECENT"],
      ["private/leaked.jpg", "MISPLACED"],
    ]);
    // The row whose object is missing is reported, not collected.
    assert.deepEqual(report.missingObjects, [{ id: "legacy", storageKey: "originals/legacy/a.jpg" }]);
  });

  test("a referenced upload is never abandoned, however old", () => {
    const report = planMediaGc(
      base({
        objects: [object("originals/x/a.jpg", 10)],
        rows: [row("x", "originals/x/a.jpg", { status: "UPLOADING", createdAt: daysAgo(10) })],
        referencedMediaIds: new Set(["x"]),
      }),
    );
    assert.equal(report.candidates.length, 0);
    assert.equal(report.abandonedRows.length, 0);
  });

  test("the report does not depend on listing order", () => {
    const objects = [object("b/1.jpg", 100), object("a/2.jpg", 100), object("private/c.jpg", 100), object("_probe/z", 5)];
    const one = planMediaGc(base({ objects }));
    const two = planMediaGc(base({ objects: [...objects].reverse() }));
    assert.equal(JSON.stringify(one), JSON.stringify(two));
  });
});

describe("media GC references come from the whole database", () => {
  let ctx: Awaited<ReturnType<typeof createApiTestContext>>;
  before(async () => {
    ctx = await createApiTestContext();
  });
  after(async () => ctx.close());

  test("published, drafted, archived and page references all count; soft-deleted unreferenced rows do not", async () => {
    const media = await ctx.q<{ id: string; storage_key: string }>(
      "select id, storage_key from media where deleted_at is null and storage_key is not null order by storage_key",
    );
    assert.ok(media.length > 5);
    const { rows, referencedMediaIds, documents } = await readGcReferences(ctx.database.db, () => null);
    assert.equal(rows.length, media.length);
    // Every imported asset is used by the imported content.
    for (const m of media) assert.ok(referencedMediaIds.has(m.id), m.storage_key);
    assert.ok(documents.length > 0);

    // Archive a published project: its media stay referenced.
    const [project] = await ctx.q<{ id: string; cover_media_id: string }>(
      "select id, cover_media_id from projects where status = 'PUBLISHED' and cover_media_id is not null limit 1",
    );
    await ctx.as("POST", `/projects/${project.id}/archive`);
    assert.ok((await readGcReferences(ctx.database.db, () => null)).referencedMediaIds.has(project.cover_media_id));

    // An unused upload that was deleted is referenced by nothing.
    const created = await ctx.as("POST", "/media/external", { provider: "vimeo", url: "https://vimeo.com/424242" });
    await ctx.as("DELETE", `/media/${created.body.data.id}`);
    const after = await readGcReferences(ctx.database.db, () => null);
    assert.ok(!after.referencedMediaIds.has(created.body.data.id));
    assert.ok(after.rows.find((r) => r.id === created.body.data.id)?.deletedAt);

    // Planning over the real references: every live object is kept.
    const report = planMediaGc({
      ...after,
      objects: media.map((m) => ({ audience: "public", key: m.storage_key, byteSize: 1, lastModified: daysAgo(400) })),
      staticKeys: new Set(),
      now: NOW,
      graceDays: 30,
      abandonedHours: 48,
    });
    assert.deepEqual(report.candidates, []);
    assert.equal(report.summary.kept.LIVE_ASSET, media.length);
  });
});

describe("bucket listings", () => {
  test("ListObjectsV2 pages are parsed, unescaped and followed", async () => {
    const pages = [
      `<ListBucketResult><IsTruncated>true</IsTruncated><Contents><Key>a/b&amp;c.jpg</Key><LastModified>2026-01-02T03:04:05.000Z</LastModified><Size>12</Size></Contents><NextContinuationToken>t&amp;1</NextContinuationToken></ListBucketResult>`,
      `<ListBucketResult><IsTruncated>false</IsTruncated><Contents><Key>private/z.mp4</Key><LastModified>2026-01-03T00:00:00.000Z</LastModified><Size>7</Size></Contents></ListBucketResult>`,
    ];
    const urls: URL[] = [];
    const storage = createS3MediaStorage(
      {
        endpoint: "https://acct.r2.cloudflarestorage.com",
        region: "auto",
        publicBucket: "pub",
        privateBucket: "priv",
        accessKeyId: "id",
        secretAccessKey: "secret",
        pathStyle: true,
        publicBaseUrl: "https://media.example.com",
        uploadTtlSeconds: 600,
      },
      (async (input: string) => {
        urls.push(new URL(input));
        return new Response(pages[urls.length - 1]);
      }) as typeof fetch,
    );
    const listed = [];
    for await (const item of storage.listObjects("private")) listed.push(item);
    assert.deepEqual(
      listed.map((o) => [o.audience, o.key, o.byteSize, o.lastModified.toISOString()]),
      [
        ["private", "a/b&c.jpg", 12, "2026-01-02T03:04:05.000Z"],
        ["private", "private/z.mp4", 7, "2026-01-03T00:00:00.000Z"],
      ],
    );
    assert.equal(urls[0].pathname, "/priv");
    assert.equal(urls[0].searchParams.get("list-type"), "2");
    assert.equal(urls[1].searchParams.get("continuation-token"), "t&1");
    assert.ok(urls.every((url) => url.searchParams.get("X-Amz-Signature")));
  });

  test("the local adapter lists files under its roots as keys", async () => {
    const { mkdtemp, mkdir, writeFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");
    const root = await mkdtemp(join(tmpdir(), "gc-"));
    await mkdir(join(root, "pub", "works"), { recursive: true });
    await mkdir(join(root, "priv", "originals"), { recursive: true });
    await writeFile(join(root, "pub", "works", "a.jpg"), "abc");
    await writeFile(join(root, "priv", "originals", "b.mp4"), "abcd");
    const storage = createLocalMediaStorage("/media", { public: join(root, "pub"), private: join(root, "priv") });
    const keys = [];
    for (const audience of ["public", "private"] as const) for await (const o of storage.listObjects(audience)) keys.push([o.audience, o.key, o.byteSize]);
    assert.deepEqual(keys, [
      ["public", "works/a.jpg", 3],
      ["private", "private/originals/b.mp4", 4],
    ]);
  });
});
