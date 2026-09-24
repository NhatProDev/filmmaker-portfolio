import { DatabaseUnavailableError, getDatabase, type Database } from "@db/client";
import { checkHealth } from "@/features/operations/health.service";
import { serverEnv } from "@/lib/env/server-env";
import { getMediaStorage, type MediaStorage } from "@/lib/storage/media-storage";
import { json } from "../_lib/route";

// Readiness for the hosting platform and for a person after a deploy or a
// restore (docs/operations/runbook.md). 200 when the site can serve; 503 when
// it cannot. Public, uncached, and free of internals.
export const dynamic = "force-dynamic";

// A signed HEAD for a key that never exists: 404 proves the provider is
// reachable and accepts these credentials. The answer is shared for a short
// while so that a public endpoint cannot be used to spend storage requests.
const PROBE_KEY = "health/probe";
const PROBE_TIMEOUT_MS = 3000;
const PROBE_REUSE_MS = 30_000;
let lastProbe: { at: number; result: Promise<void> } | null = null;

function probeStorage(storage: MediaStorage): Promise<void> {
  if (lastProbe && Date.now() - lastProbe.at < PROBE_REUSE_MS) return lastProbe.result;
  const result = Promise.race([
    storage.verifyUpload(PROBE_KEY).then(() => undefined),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("storage probe timed out")), PROBE_TIMEOUT_MS)),
  ]);
  lastProbe = { at: Date.now(), result };
  return result;
}

export async function GET() {
  let db: Database | null = null;
  try {
    db = getDatabase();
  } catch (error) {
    if (!(error instanceof DatabaseUnavailableError)) throw error;
  }
  let storage: MediaStorage | null = null;
  try {
    storage = getMediaStorage();
  } catch {
    storage = null;
  }
  const health = await checkHealth({
    db,
    databaseRequired: serverEnv().SITE_CONTENT_ADAPTER === "db",
    storageConfigured: storage !== null,
    // The local adapter reads this server's own disk: nothing to reach.
    probeStorage: storage && storage.provider !== "local" ? () => probeStorage(storage) : undefined,
  });
  return json({ data: health }, health.status === "unavailable" ? 503 : 200);
}
