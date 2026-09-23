import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Database } from "@db/client";
import * as schema from "@db/schema";

// A disposable in-memory PostgreSQL (PGlite) with every migration applied. No
// server, no network, nothing outside this process.
export async function createTestDatabase() {
  const client = await PGlite.create({ extensions: { pgcrypto } });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "db/migrations" });
  return {
    db: db as unknown as Database,
    client,
    migrate: () => migrate(db, { migrationsFolder: "db/migrations" }),
    close: () => client.close(),
  };
}
