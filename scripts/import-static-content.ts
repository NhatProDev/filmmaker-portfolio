// Imports the committed static content into the database model.
//
//   npm run db:import              dry run: inventory, deduplication, plan
//   npm run db:import -- --apply   create what is missing (local database only)
//   npm run db:import -- --json    also print the plan as JSON
//
// It also creates the About, Contact and site-settings working copies
// (scripts/lib/page-content-import.ts); nothing becomes public until an
// admin publishes each page.
//
// With no DATABASE_URL the dry run plans against an empty database. The
// import is create-only and idempotent: see scripts/lib/static-import.ts.

import { resolve } from "node:path";
import { createDatabase } from "@db/client";
import { staticGateway } from "@/features/site-content/static-gateway";
import { serverEnv } from "@/lib/env/server-env";
import { assertDatabaseTarget, describeDatabase } from "./lib/database-target";
import { importContentPages } from "./lib/page-content-import";
import { applyImportPlan, buildImportPlan, type ImportPlan } from "./lib/static-import";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");

function printPlan(plan: ImportPlan) {
  const { inventory } = plan;
  const imported = inventory.placements.filter((p) => p.imported);
  const existing = [...inventory.files.values()].filter((f) => f.exists);
  const bytes = existing.reduce((sum, f) => sum + (f.exists ? f.byteSize : 0), 0);
  const uniqueBytes = [...new Map(existing.map((f) => [f.exists && f.sha256, f])).values()].reduce(
    (sum, f) => sum + (f.exists ? f.byteSize : 0),
    0,
  );
  const blocks = (list: { children: unknown[] }[]): number =>
    list.reduce((n, b) => n + 1 + blocks(b.children as { children: unknown[] }[]), 0);

  console.log("MEDIA INVENTORY");
  console.log(`  placements referenced by the site   ${inventory.placements.length} (${imported.length} imported with projects and Home; About and Contact as structured pages)`);
  console.log(`  distinct files                      ${inventory.files.size} (${(bytes / 1e6).toFixed(1)} MB)`);
  console.log(`  missing files                       ${inventory.missing.length}`);
  console.log(`  dimension mismatches                ${inventory.dimensionMismatches.length}`);
  console.log(`  unique contents (by SHA-256)        ${new Set(existing.map((f) => f.exists && f.sha256)).size} (${(uniqueBytes / 1e6).toFixed(1)} MB)`);
  console.log(`  duplicate groups                    ${inventory.duplicateGroups.length}`);
  for (const group of inventory.duplicateGroups) console.log(`    ${group.checksum.slice(0, 12)}  ${group.keys.join("  ")}`);
  console.log("\nPLAN");
  console.log(`  media assets                        ${plan.assets.length} (${plan.assets.filter((a) => a.type === "VIDEO").length} video, ${plan.assets.filter((a) => a.posterChecksum).length} with a poster)`);
  console.log(`  projects                            ${plan.projects.length} (${plan.projects.filter((p) => p.blocks.length).length} with a composition)`);
  console.log(`  project blocks                      ${plan.projects.reduce((n, p) => n + blocks(p.blocks), 0)}`);
  console.log(`  HOME blocks                         ${blocks(plan.home)}`);
  if (inventory.placementPosterOverrides.length) {
    console.log("\nPLACEMENT POSTER OVERRIDES (ADR-0015)");
    inventory.placementPosterOverrides.forEach((c) => console.log(`  ${c}`));
  }
  if (plan.issues.length) {
    console.log("\nISSUES (block --apply)");
    plan.issues.forEach((i) => console.log(`  ${i}`));
  }
  if (args.has("--json")) {
    console.log(JSON.stringify({ ...plan, inventory: { ...inventory, files: Object.fromEntries(inventory.files) } }, null, 2));
  }
}

async function main() {
  const plan = await buildImportPlan(staticGateway, resolve("public/media"));
  printPlan(plan);

  const { DATABASE_URL } = serverEnv();
  if (!DATABASE_URL) {
    if (apply) throw new Error("--apply needs DATABASE_URL (a local development database).");
    console.log("\nNo DATABASE_URL: every step above would be a create. Dry run only; nothing written.");
    return;
  }

  const target = assertDatabaseTarget(DATABASE_URL);
  if (target.remote) console.log(`REMOTE  ${target.label} (confirmed on the command line)`);
  const handle = createDatabase(DATABASE_URL, { max: 1 });
  try {
    console.log(`\nTARGET  ${target.host}/${target.database}  ${await describeDatabase(handle.db)}`);
    const report = await applyImportPlan(handle.db, plan, apply);
    console.log(`\n${apply ? "APPLIED" : "DRY RUN"}  create ${report.created} · unchanged ${report.unchanged} · drift ${report.drift.length}`);
    report.operations.forEach((op) => console.log(`  ${op}`));
    report.drift.forEach((d) => console.log(`  drift: ${d}`));

    // About, Contact and the site settings as structured pages (ADR-0017):
    // working copies only; each goes live when an admin publishes it.
    const pagesReport = await importContentPages(handle.db, staticGateway, resolve("public/media"), apply);
    console.log(`
STRUCTURED PAGES (working copies, not published)`);
    for (const page of pagesReport.pages) console.log(`  ${page.action.padEnd(9)} ${page.key}${page.detail ? ` — ${page.detail}` : ""}`);
    for (const key of pagesReport.mediaCreated) console.log(`  create    media ${key}`);
    if (!apply) console.log("\nNothing written. Re-run with --apply to create the items above.");
  } finally {
    await handle.close();
  }
  if (plan.issues.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
