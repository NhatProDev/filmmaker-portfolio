// The media lifecycle audit and garbage collection
// (docs/operations/media-lifecycle.md).
//
//   npm run media:gc                                   dry run: the report only
//   npm run media:gc -- --out=gc.json                  and the full JSON
//   npm run media:gc -- --apply --confirm-storage=<public-bucket>+<private-bucket>
//
// A dry run reads the database (one read-only snapshot) and lists both
// buckets; it writes nothing anywhere. --apply removes only the objects the
// report names and soft-deletes only abandoned upload rows, after planning a
// second time and acting on what both plans agree on. It refuses to run
// against S3-compatible storage unless --confirm-storage names both buckets,
// and refuses more than --max-delete removals (default 25). A non-local
// database needs --confirm-remote=<host>/<database> like every database
// script. Take a backup first (runbook §4) and keep bucket versioning in mind:
// an object removed here is gone unless the provider keeps versions.
//
// Options: --grace-days=30 (unreferenced objects younger than this are kept),
// --abandoned-hours=48 (uploads never completed within this are abandoned).

import { writeFileSync } from "node:fs";
import { and, eq, isNull } from "drizzle-orm";
import { createDatabase, transaction } from "@db/client";
import { media } from "@db/schema";
import { committedPages } from "@/features/page-content/committed";
import { staticGateway } from "@/features/site-content/static-gateway";
import { serverEnv } from "@/lib/env/server-env";
import { mediaKeyFromUrl } from "@/lib/storage/media-url";
import { createMediaStorageFromEnv, setMediaStorageForTesting, type ListedObject } from "@/lib/storage/media-storage";
import { assertDatabaseTarget, describeDatabase } from "./lib/database-target";
import { formatGcReport, planMediaGc, readGcReferences, type GcReport } from "./lib/media-gc";

const option = (name: string) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const count = (name: string, fallback: number) => {
  const value = option(name);
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value)) throw new Error(`--${name} must be a whole number`);
  return Number(value);
};

// Every media key the committed static content uses: the fallback site must
// keep working from the same buckets.
async function staticKeys(): Promise<Set<string>> {
  const keys = new Set<string>();
  const visit = (value: unknown): void => {
    if (typeof value === "string") {
      const key = mediaKeyFromUrl(value);
      if (key) keys.add(key);
    } else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  const slugs = await staticGateway.listPublicProjectSlugs();
  visit(await staticGateway.getHome());
  visit(await staticGateway.getWorksIndex());
  visit(await staticGateway.getAbout());
  visit(await staticGateway.getContact());
  visit(await committedPages(staticGateway));
  for (const slug of slugs) visit(await staticGateway.getProjectPage(slug));
  return keys;
}

async function main() {
  const env = serverEnv();
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");
  const target = assertDatabaseTarget(env.DATABASE_URL);
  const apply = process.argv.includes("--apply");
  const graceDays = count("grace-days", 30);
  const abandonedHours = count("abandoned-hours", 48);
  const maxDelete = count("max-delete", 25);
  const storage = createMediaStorageFromEnv(env);
  // mediaKeyFromUrl and the static content resolve through this adapter.
  setMediaStorageForTesting(storage);

  if (apply && storage.provider === "s3") {
    const expected = `${env.S3_PUBLIC_BUCKET}+${env.S3_PRIVATE_BUCKET}`;
    if (option("confirm-storage") !== expected) {
      throw new Error("Refusing to remove objects: name both buckets for this run with --confirm-storage=<public-bucket>+<private-bucket>.");
    }
  }

  const handle = createDatabase(env.DATABASE_URL, { max: 1, prepare: env.DATABASE_PREPARE === "true" });
  try {
    console.log(`TARGET  ${target.label}  ${await describeDatabase(handle.db)}  storage ${storage.provider}  (${apply ? "APPLY" : "dry run"})`);
    const statics = await staticKeys();

    const plan = async (): Promise<GcReport> => {
      const objects: ListedObject[] = [];
      for (const audience of ["public", "private"] as const) for await (const object of storage.listObjects(audience)) objects.push(object);
      const references = await readGcReferences(handle.db, mediaKeyFromUrl);
      return planMediaGc({ objects, ...references, staticKeys: statics, now: new Date(), graceDays, abandonedHours });
    };

    const report = await plan();
    console.log(formatGcReport(report));
    const out = option("out");
    if (out) {
      writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
      console.log(`\nWrote ${out}`);
    }
    const removals = report.candidates.length + report.abandonedRows.length;
    if (!apply) {
      console.log(removals ? "\nDry run: nothing written or removed. Review, then add --apply." : "\nNothing to collect.");
      return;
    }
    if (removals > maxDelete) throw new Error(`Refusing to remove ${removals} item(s): more than --max-delete=${maxDelete}.`);

    // Act only on what a second, independent plan agrees on.
    const again = await plan();
    const agreed = (list: { key: string }[]) => new Set(list.map((c) => c.key));
    const keys = agreed(again.candidates);
    const rowIds = new Set(again.abandonedRows.map((row) => row.id));

    for (const row of report.abandonedRows.filter((r) => rowIds.has(r.id))) {
      const done = await transaction(handle.db, async (tx) => {
        const [locked] = await tx.select().from(media).where(and(eq(media.id, row.id), isNull(media.deletedAt))).for("update");
        if (!locked || locked.status !== "UPLOADING") return false;
        await tx.update(media).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(media.id, row.id));
        return true;
      });
      console.log(`${done ? "soft-deleted" : "skipped    "} upload row ${row.id}`);
    }
    for (const candidate of report.candidates.filter((c) => keys.has(c.key))) {
      await storage.deleteObject(candidate.key);
      console.log(`removed ${candidate.audience} ${candidate.key}`);
    }
    console.log("\nApplied. Run the dry run again: it must name nothing that was removed.");
  } finally {
    await handle.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
