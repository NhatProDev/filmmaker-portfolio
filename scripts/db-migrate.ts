// Applies db/migrations to the database DATABASE_URL names.
//
//   npm run db:migrate
//
// Refuses a non-local database unless --confirm-remote=<host>/<database> names
// it (scripts/lib/database-target.ts), and prints what it is about to
// change before changing it. The Drizzle migrator runs pending migrations in
// one transaction and skips those already applied.

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { serverEnv } from "@/lib/env/server-env";
import type { Database } from "@db/client";
import { assertDatabaseTarget, describeDatabase } from "./lib/database-target";

async function main() {
  const { DATABASE_URL } = serverEnv();
  if (!DATABASE_URL) throw new Error("DATABASE_URL is not set.");
  const target = assertDatabaseTarget(DATABASE_URL);
  if (target.remote) console.log(`REMOTE  ${target.label} (confirmed on the command line)`);
  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client);
  try {
    console.log(`TARGET  ${target.host}/${target.database}  ${await describeDatabase(db as unknown as Database)}`);
    await migrate(db, { migrationsFolder: "db/migrations" });
    const applied = await client`select hash, created_at from drizzle.__drizzle_migrations order by created_at`;
    console.log(`Migrations applied: ${applied.length}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
