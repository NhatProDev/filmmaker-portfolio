// Applies db/migrations to a local development database.
//
//   npm run db:migrate
//
// Refuses any database that is not local, and prints what it is about to
// change before changing it. The Drizzle migrator runs pending migrations in
// one transaction and skips those already applied.

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { serverEnv } from "@/lib/env/server-env";
import type { Database } from "@db/client";
import { assertLocalDatabaseUrl, describeDatabase } from "./lib/database-target";

async function main() {
  const { DATABASE_URL } = serverEnv();
  if (!DATABASE_URL) throw new Error("DATABASE_URL is not set.");
  const target = assertLocalDatabaseUrl(DATABASE_URL);
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
