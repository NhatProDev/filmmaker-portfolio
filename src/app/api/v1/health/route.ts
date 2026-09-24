import { DatabaseUnavailableError, getDatabase, type Database } from "@db/client";
import { checkHealth } from "@/features/operations/health.service";
import { serverEnv } from "@/lib/env/server-env";
import { getMediaStorage } from "@/lib/storage/media-storage";
import { json } from "../_lib/route";

// Readiness for the hosting platform and for a person after a deploy or a
// restore (docs/operations/runbook.md). 200 when the site can serve; 503 when
// it cannot. Public, uncached, and free of internals.
export const dynamic = "force-dynamic";

export async function GET() {
  let db: Database | null = null;
  try {
    db = getDatabase();
  } catch (error) {
    if (!(error instanceof DatabaseUnavailableError)) throw error;
  }
  let storageConfigured = true;
  try {
    getMediaStorage();
  } catch {
    storageConfigured = false;
  }
  const health = await checkHealth({
    db,
    databaseRequired: serverEnv().SITE_CONTENT_ADAPTER === "db",
    storageConfigured,
  });
  return json({ data: health }, health.status === "unavailable" ? 503 : 200);
}
