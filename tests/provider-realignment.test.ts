import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { MediaStorage } from "@/lib/storage/media-storage";
import { realignStorageProvider } from "../scripts/lib/provider-realignment";
import { createApiTestContext } from "./helpers/api";

// ADR-0020 §2: production's imported rows say `local` while R2 holds their
// files. Realignment moves rows whose object the adapter confirms, together
// with every snapshot's copy of the record, and must never make a published
// page report unpublished changes.

describe("storage-provider realignment (ADR-0020)", () => {
  let ctx: Awaited<ReturnType<typeof createApiTestContext>>;
  let missingKey: string;
  const storage: MediaStorage = {
    provider: "s3",
    publicUrl: (key) => `https://media.example.com/${key}`,
    signedDeliveryUrl: () => null,
    localPath: () => null,
    createUpload: async () => {
      throw new Error("not used");
    },
    verifyUpload: async (key) => (key === missingKey ? null : { key, byteSize: 1 }),
    deleteObject: async () => {},
    listObjects: async function* () {},
  };

  before(async () => {
    ctx = await createApiTestContext();
    missingKey = (await ctx.q<{ storage_key: string }>(`select storage_key from media where type = 'IMAGE' order by storage_key limit 1`))[0].storage_key;
  });
  after(() => ctx.close());

  const dirtyProjects = async () => {
    const ids = await ctx.q<{ id: string }>(`select project_id as id from project_publications`);
    const dirty: string[] = [];
    for (const { id } of ids) {
      const detail = (await ctx.as("GET", `/projects/${id}`)).body.data;
      if (detail.publication.hasUnpublishedChanges) dirty.push(id);
    }
    return { published: ids.length, dirty };
  };

  test("a dry run writes nothing", async () => {
    const before = await ctx.q(`select count(*)::int as n from media where storage_provider = 'local'`);
    const report = await realignStorageProvider(ctx.database.db, storage, { apply: false });
    assert.ok(report.confirmed.length > 0 && report.snapshots.length > 0);
    assert.deepEqual(await ctx.q(`select count(*)::int as n from media where storage_provider = 'local'`), before);
  });

  test("apply realigns confirmed rows and their snapshot copies, leaving no false unpublished changes", async () => {
    const { published } = await dirtyProjects();
    assert.ok(published > 0, "the imported content is published");
    const report = await realignStorageProvider(ctx.database.db, storage, { apply: true });
    assert.equal(report.applied, true);
    assert.deepEqual(report.missing.map((row) => row.key), [missingKey]);
    const rows = await ctx.q<{ storage_key: string; storage_provider: string }>(
      `select storage_key, storage_provider from media where storage_key is not null and deleted_at is null`,
    );
    for (const row of rows) assert.equal(row.storage_provider, row.storage_key === missingKey ? "local" : "s3", row.storage_key);
    assert.deepEqual((await dirtyProjects()).dirty, []);
    const home = (await ctx.as("GET", "/pages/HOME")).body.data;
    assert.equal(home.publication.hasUnpublishedChanges, false);
  });

  test("a second run changes nothing", async () => {
    const report = await realignStorageProvider(ctx.database.db, storage, { apply: true });
    assert.equal(report.confirmed.length, 0);
    assert.equal(report.snapshots.length, 0);
    assert.equal(report.missing.length, 1);
  });
});
