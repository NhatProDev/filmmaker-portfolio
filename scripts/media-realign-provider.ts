// Realigns media rows recorded under another storage provider than the one
// holding their files (ADR-0020 §2, docs/operations/runbook.md §10).
//
//   npm run media:realign-provider                 dry run: what would change
//   npm run media:realign-provider -- --apply      write, in one transaction
//
// A row is realigned only after the configured adapter confirms its object.
// Snapshot copies are realigned in the same transaction, so nothing starts
// reporting unpublished changes. Idempotent. A non-local database needs
// --confirm-remote=<host>/<database>; take a backup first (runbook §4).

import { createDatabase } from "@db/client";
import { serverEnv } from "@/lib/env/server-env";
import { createMediaStorageFromEnv } from "@/lib/storage/media-storage";
import { assertDatabaseTarget, describeDatabase } from "./lib/database-target";
import { realignStorageProvider } from "./lib/provider-realignment";

async function main() {
  const env = serverEnv();
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");
  const target = assertDatabaseTarget(env.DATABASE_URL);
  const apply = process.argv.includes("--apply");
  const handle = createDatabase(env.DATABASE_URL, { max: 1, prepare: env.DATABASE_PREPARE === "true" });
  try {
    console.log(`TARGET  ${target.label}  ${await describeDatabase(handle.db)}  (${apply ? "APPLY" : "dry run"})`);
    const report = await realignStorageProvider(handle.db, createMediaStorageFromEnv(env), { apply });
    console.log(`provider ${report.provider}: ${report.candidates} row(s) recorded elsewhere`);
    for (const row of report.confirmed) console.log(`  realign  ${row.from ?? "(none)"} → ${report.provider}  ${row.key}`);
    for (const row of report.missing) console.log(`  MISSING  ${row.key} — not in ${report.provider} storage; left unchanged`);
    for (const snapshot of report.snapshots) console.log(`  snapshot ${snapshot.owner}: ${snapshot.records} record(s)`);
    console.log(report.applied ? "\nApplied." : report.confirmed.length ? "\nDry run: nothing written. Add --apply." : "\nNothing to realign.");
    if (report.missing.length) process.exitCode = 2;
  } finally {
    await handle.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
