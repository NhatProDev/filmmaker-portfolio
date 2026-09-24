// Read-only verification of a database and its media (docs/operations/runbook.md):
// after a deploy, a migration, an import or a restore.
//
//   npm run db:health
//
// Checks: the database answers; its applied migrations match the ones this
// code ships; every published snapshot still validates and renders on the
// public templates; every file the site needs is where the storage adapter
// will look for it (local adapter). Exits non-zero on any failure. It writes
// nothing. A non-local database needs --confirm-remote=<host>/<database>.

import { createDatabase } from "@db/client";
import { pagePublications, pages, projectPublications, projects } from "@db/schema";
import { eq } from "drizzle-orm";
import { checkHealth } from "@/features/operations/health.service";
import { pageSnapshotIssues } from "@/features/project-builder/page-publication.service";
import { projectSnapshotIssues } from "@/features/projects/publication.service";
import { staticGateway } from "@/features/site-content/static-gateway";
import { serverEnv } from "@/lib/env/server-env";
import { createMediaStorageFromEnv } from "@/lib/storage/media-storage";
import { assertDatabaseTarget, describeDatabase } from "./lib/database-target";
import { buildMediaManifest } from "./lib/media-manifest";
import { probeMediaFile } from "./lib/media-probe";
import { buildImportPlan } from "./lib/static-import";

async function main() {
  const env = serverEnv();
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");
  const target = assertDatabaseTarget(env.DATABASE_URL);
  const handle = createDatabase(env.DATABASE_URL, { max: 1, prepare: env.DATABASE_PREPARE === "true" });
  const failures: string[] = [];
  try {
    console.log(`TARGET  ${target.label}  ${await describeDatabase(handle.db)}  (read only)`);

    const health = await checkHealth({ db: handle.db, databaseRequired: true, storageConfigured: true });
    console.log(`database ${health.checks.database} · schema ${health.checks.schema}`);
    if (health.checks.database !== "ok") failures.push(`database: ${health.checks.database}`);
    if (health.checks.schema !== "ok") failures.push(`schema: ${health.checks.schema} (run npm run db:migrate)`);

    const published = await handle.db
      .select({ slug: projects.slug, visibility: projects.visibility, snapshot: projectPublications.snapshot })
      .from(projectPublications)
      .innerJoin(projects, eq(projects.id, projectPublications.projectId));
    for (const row of published) {
      for (const issue of projectSnapshotIssues(row.snapshot, row.slug, row.visibility)) failures.push(`project ${row.slug}: ${issue}`);
    }
    const pageRows = await handle.db
      .select({ key: pages.key, snapshot: pagePublications.snapshot })
      .from(pagePublications)
      .innerJoin(pages, eq(pages.id, pagePublications.pageId));
    for (const row of pageRows) {
      for (const issue of pageSnapshotIssues(row.snapshot)) failures.push(`page ${row.key}: ${issue}`);
    }
    console.log(`published snapshots: ${published.length} project(s), ${pageRows.length} page(s)`);

    if (env.MEDIA_STORAGE_PROVIDER === "local") {
      const storage = createMediaStorageFromEnv(env);
      const plan = await buildImportPlan(staticGateway, "public/media");
      const manifest = await buildMediaManifest({
        db: handle.db,
        staticPlacements: plan.inventory.placements,
        pathFor: (provider, key) => (provider === "local" || provider === null ? storage.localPath(key) : null),
        probe: probeMediaFile,
      });
      console.log(`media: ${manifest.summary.deploy} file(s) needed, ${manifest.summary.missingFiles} missing`);
      failures.push(...manifest.missing.map((line) => `missing media: ${line}`));
    } else {
      console.log("media: remote storage — compare `npm run media:manifest` with the bucket listing");
    }
  } finally {
    await handle.close();
  }
  if (failures.length) {
    console.error(`\n${failures.length} problem(s):`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exitCode = 2;
  } else {
    console.log("\nHealthy.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
