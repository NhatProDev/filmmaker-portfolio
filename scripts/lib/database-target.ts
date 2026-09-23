import { sql } from "drizzle-orm";
import type { Database } from "@db/client";

// Phase 2C writes only to a local development database. A DATABASE_URL that
// merely exists is not permission to change the database it points at.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function assertLocalDatabaseUrl(url: string): { host: string; database: string } {
  const parsed = new URL(url);
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  if (host && !LOCAL_HOSTS.has(host)) {
    throw new Error(
      `Refusing to write to the database at "${host}": only a local development database ` +
        "(localhost, 127.0.0.1, ::1 or a local socket) may be written in this phase.",
    );
  }
  return { host: host || "(local socket)", database: decodeURIComponent(parsed.pathname.slice(1)) };
}

export async function describeDatabase(db: Database): Promise<string> {
  const rows = (await db.execute(
    sql`select current_database() as database, current_user as "user", version() as version`,
  )) as unknown as { database: string; user: string; version: string }[];
  const row = Array.isArray(rows) ? rows[0] : (rows as unknown as { rows: typeof rows }).rows[0];
  return `${row.database} as ${row.user} — ${row.version.split(",")[0]}`;
}
