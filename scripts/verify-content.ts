// Verifies that the database serves exactly what the committed static content
// serves, route by route, before the site is switched to the database adapter.
//
//   npm run db:verify
//
// Read-only: it writes nothing. It compares published snapshots (what the
// public site reads) with src/content, by media content, and exits non-zero on
// any difference. Like the other database scripts it connects only to a local
// database; the media files must be present in public/media.

import { resolve } from "node:path";
import { createDatabase } from "@db/client";
import { createDbGateway } from "@/features/site-content/db-gateway";
import { staticGateway } from "@/features/site-content/static-gateway";
import { serverEnv } from "@/lib/env/server-env";
import { compareGateways } from "./lib/content-parity";
import { assertLocalDatabaseUrl, describeDatabase } from "./lib/database-target";
import { buildImportPlan } from "./lib/static-import";

async function main() {
  const { DATABASE_URL, DATABASE_PREPARE } = serverEnv();
  if (!DATABASE_URL) throw new Error("DATABASE_URL is not set.");
  const target = assertLocalDatabaseUrl(DATABASE_URL);
  const plan = await buildImportPlan(staticGateway, resolve("public/media"));
  const handle = createDatabase(DATABASE_URL, { max: 1, prepare: DATABASE_PREPARE === "true" });
  try {
    console.log(`TARGET  ${target.host}/${target.database}  ${await describeDatabase(handle.db)}`);
    const results = await compareGateways(createDbGateway(handle.db), staticGateway, plan.inventory.files);
    let failed = 0;
    for (const { route, diffs } of results) {
      if (diffs.length) failed += 1;
      console.log(`${diffs.length ? "DIFFERS" : "same   "}  ${route}${diffs.length ? `  — ${diffs.slice(0, 5).join(", ")}` : ""}`);
    }
    console.log(`\n${results.length - failed} of ${results.length} routes identical by content.`);
    if (failed) process.exitCode = 1;
  } finally {
    await handle.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
