import { sql } from "drizzle-orm";
import type { Database } from "@db/client";

// Which database a script may connect to. A DATABASE_URL that merely exists is
// not permission to use the database it points at:
//
// - a local development database (localhost, 127.0.0.1, ::1 or a local
//   socket) is always allowed;
// - any other host is refused unless the command line names that exact target,
//   `--confirm-remote=<host>/<database>`, typed for this run. Nothing reads the
//   confirmation from the environment, so it cannot be left switched on.
//
// docs/operations/runbook.md describes the production workflows that use it.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export type DatabaseTarget = { host: string; database: string; remote: boolean; label: string };

export function parseDatabaseTarget(url: string): DatabaseTarget {
  const parsed = new URL(url);
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  const database = decodeURIComponent(parsed.pathname.slice(1));
  const remote = Boolean(host) && !LOCAL_HOSTS.has(host);
  return { host: host || "(local socket)", database, remote, label: `${host || "(local socket)"}/${database}` };
}

export function assertDatabaseTarget(url: string, argv: readonly string[] = process.argv): DatabaseTarget {
  const target = parseDatabaseTarget(url);
  if (!target.remote) return target;
  const confirmation = argv.find((arg) => arg.startsWith("--confirm-remote="))?.slice("--confirm-remote=".length);
  if (confirmation !== target.label) {
    throw new Error(
      `Refusing to use the non-local database "${target.label}". ` +
        `If this is intended, re-run with --confirm-remote=${target.label} ` +
        "after checking the runbook (docs/operations/runbook.md) and taking a backup.",
    );
  }
  return target;
}

export async function describeDatabase(db: Database): Promise<string> {
  const rows = (await db.execute(
    sql`select current_database() as database, current_user as "user", version() as version`,
  )) as unknown as { database: string; user: string; version: string }[];
  const row = Array.isArray(rows) ? rows[0] : (rows as unknown as { rows: typeof rows }).rows[0];
  return `${row.database} as ${row.user} — ${row.version.split(",")[0]}`;
}
