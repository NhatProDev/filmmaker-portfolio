import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { serverEnv } from "@/lib/env/server-env";
import * as schema from "./schema";

// Any Drizzle PostgreSQL database over this schema: the application's
// postgres.js connection, or the in-process engine the tests use.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = PgDatabase<PgQueryResultHKT, typeof schema, any>;

export type DatabaseHandle = {
  db: Database;
  close: () => Promise<void>;
};

export function createDatabase(url: string, options: { max?: number; prepare?: boolean } = {}): DatabaseHandle {
  const client = postgres(url, { max: options.max ?? 10, prepare: options.prepare ?? true });
  return {
    db: drizzle(client, { schema }) as unknown as Database,
    close: () => client.end(),
  };
}

let shared: DatabaseHandle | undefined;
let substitute: Database | null = null;

// Tests run route handlers against an in-process database.
export function setDatabaseForTesting(db: Database | null) {
  substitute = db;
}

export class DatabaseUnavailableError extends Error {}

// The application's connection, opened on first use. Nothing connects unless
// the database content adapter or the Studio needs it.
export function getDatabase(): Database {
  if (substitute) return substitute;
  if (!shared) {
    const { DATABASE_URL, DATABASE_POOL_MAX, DATABASE_PREPARE } = serverEnv();
    if (!DATABASE_URL) throw new DatabaseUnavailableError("DATABASE_URL is not set");
    shared = createDatabase(DATABASE_URL, { max: DATABASE_POOL_MAX, prepare: DATABASE_PREPARE === "true" });
  }
  return shared.db;
}

// Runs `work` in one transaction (CLAUDE.md §15). Inside a transaction it
// becomes a savepoint, so services compose.
export function transaction<T>(db: Database, work: (tx: Database) => Promise<T>): Promise<T> {
  return db.transaction((tx) => work(tx as unknown as Database));
}
