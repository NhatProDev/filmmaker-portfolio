// The production media manifest: a read-only dry run of the media migration
// (docs/operations/media-migration.md).
//
//   npm run media:manifest                        summary only
//   npm run media:manifest -- --out=manifest.json and the full JSON
//
// With DATABASE_URL it covers every asset in the database plus the files only
// committed static content uses (About, Contact); without it, the static
// content alone. It never writes to the database or to storage, and never
// moves, deletes or re-encodes a file. A non-local database needs
// --confirm-remote=<host>/<database> like every database script.

import { writeFileSync } from "node:fs";
import { createDatabase } from "@db/client";
import { staticGateway } from "@/features/site-content/static-gateway";
import { serverEnv } from "@/lib/env/server-env";
import { createMediaStorageFromEnv } from "@/lib/storage/media-storage";
import { assertDatabaseTarget, describeDatabase } from "./lib/database-target";
import { formatManifestSummary, buildMediaManifest } from "./lib/media-manifest";
import { probeMediaFile } from "./lib/media-probe";
import { buildImportPlan } from "./lib/static-import";

async function main() {
  const env = serverEnv();
  const out = process.argv.find((arg) => arg.startsWith("--out="))?.slice("--out=".length);
  const storage = createMediaStorageFromEnv({ ...env, MEDIA_STORAGE_PROVIDER: "local" });
  const plan = await buildImportPlan(staticGateway, "public/media");

  // The target is checked before anything connects.
  const target = env.DATABASE_URL ? assertDatabaseTarget(env.DATABASE_URL) : null;
  const handle = env.DATABASE_URL ? createDatabase(env.DATABASE_URL, { max: 1, prepare: env.DATABASE_PREPARE === "true" }) : null;
  try {
    if (handle && target) {
      console.log(`SOURCE  ${target.label}  ${await describeDatabase(handle.db)}  (read only)`);
    } else {
      console.log("SOURCE  committed static content only (DATABASE_URL is not set)");
    }
    const manifest = await buildMediaManifest({
      db: handle?.db ?? null,
      staticPlacements: plan.inventory.placements,
      // Files are read where the local adapter keeps them.
      pathFor: (provider, key) => (provider === "local" || provider === null ? storage.localPath(key) : null),
      probe: probeMediaFile,
    });
    console.log(formatManifestSummary(manifest));
    if (out) {
      writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`);
      console.log(`\nWrote ${out}`);
    }
    if (manifest.summary.missingFiles || manifest.summary.collisions) process.exitCode = 2;
  } finally {
    await handle?.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
