import { sql } from "drizzle-orm";
import type { Database } from "@db/client";
import journal from "../../../db/migrations/meta/_journal.json";

// Lightweight readiness (docs/operations/runbook.md): is the database
// reachable, is its schema the one this build expects, is storage configured.
// It reports states, never versions, hosts or errors, because the endpoint is
// public.

export type CheckState = "ok" | "not-configured" | "unreachable" | "behind" | "ahead" | "unknown" | "misconfigured";

export type Health = {
  status: "ok" | "degraded" | "unavailable";
  checks: { database: CheckState; schema: CheckState; storage: CheckState };
};

// Migrations this build ships, by the timestamp drizzle records for each.
const shipped = new Set(journal.entries.map((entry) => String(entry.when)));

const rowsOf = <T,>(result: unknown): T[] =>
  Array.isArray(result) ? (result as T[]) : ((result as { rows?: T[] }).rows ?? []);

async function schemaState(db: Database): Promise<CheckState> {
  const result = await db.execute(sql`select created_at from drizzle.__drizzle_migrations`);
  const applied = new Set(rowsOf<{ created_at: string | number }>(result).map((row) => String(row.created_at)));
  if ([...applied].some((when) => !shipped.has(when))) return "ahead";
  if ([...shipped].some((when) => !applied.has(when))) return "behind";
  return "ok";
}

export async function checkHealth(input: {
  // null when no DATABASE_URL is configured.
  db: Database | null;
  // Whether this deployment needs the database to serve its pages.
  databaseRequired: boolean;
  storageConfigured: boolean;
}): Promise<Health> {
  let database: CheckState = "not-configured";
  let schema: CheckState = "unknown";
  if (input.db) {
    try {
      await input.db.execute(sql`select 1`);
      database = "ok";
      schema = await schemaState(input.db).catch(() => "unknown" as const);
    } catch {
      database = "unreachable";
    }
  }
  const storage: CheckState = input.storageConfigured ? "ok" : "misconfigured";

  const failed = (input.databaseRequired && database !== "ok") || (database === "ok" && schema !== "ok");
  const status = failed ? "unavailable" : storage !== "ok" ? "degraded" : "ok";
  return { status, checks: { database, schema, storage } };
}
