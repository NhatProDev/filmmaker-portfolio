import { and, eq, inArray, isNotNull, isNull, ne } from "drizzle-orm";
import { transaction, type Database } from "@db/client";
import { media, pagePublications, projectPublications } from "@db/schema";
import type { MediaStorage } from "@/lib/storage/media-storage";

// ADR-0020 §2: rows recorded under another storage provider than the one that
// now holds their files. Each row is realigned only after the configured
// adapter confirms its object at that key. In the same transaction every
// current snapshot's copy of the record is realigned too, so no page reports
// unpublished changes: the renderer never reads the provider, but the
// working-copy comparison does. Idempotent: a second run finds nothing.

export type RealignmentReport = {
  provider: string;
  candidates: number;
  confirmed: { id: string; key: string; from: string | null }[];
  missing: { id: string; key: string; from: string | null }[];
  snapshots: { owner: string; records: number }[];
  applied: boolean;
};

type SnapshotMedia = { id: string; storageProvider: string | null };

function realignRecords(snapshot: unknown, ids: ReadonlySet<string>, provider: string): { snapshot: unknown; changed: number } {
  const value = snapshot as { media?: SnapshotMedia[] };
  if (!value || !Array.isArray(value.media)) return { snapshot, changed: 0 };
  let changed = 0;
  const records = value.media.map((record) => {
    if (!ids.has(record.id) || record.storageProvider === provider) return record;
    changed += 1;
    return { ...record, storageProvider: provider };
  });
  return { snapshot: changed ? { ...value, media: records } : snapshot, changed };
}

export async function realignStorageProvider(
  db: Database,
  storage: MediaStorage,
  options: { apply: boolean },
): Promise<RealignmentReport> {
  const provider = storage.provider;
  const rows = await db
    .select({ id: media.id, key: media.storageKey, from: media.storageProvider })
    .from(media)
    .where(and(isNull(media.deletedAt), isNotNull(media.storageKey), ne(media.type, "EXTERNAL_VIDEO")));
  const candidates = rows.filter((row) => row.from !== provider) as { id: string; key: string; from: string | null }[];

  const confirmed: RealignmentReport["confirmed"] = [];
  const missing: RealignmentReport["missing"] = [];
  for (const row of candidates) {
    (await storage.verifyUpload(row.key)) ? confirmed.push(row) : missing.push(row);
  }
  const ids = new Set(confirmed.map((row) => row.id));
  const report: RealignmentReport = { provider, candidates: candidates.length, confirmed, missing, snapshots: [], applied: false };
  if (!ids.size) return report;

  const run = async (tx: Database) => {
    const projectRows = await tx.select().from(projectPublications);
    for (const row of projectRows) {
      const { snapshot, changed } = realignRecords(row.snapshot, ids, provider);
      if (!changed) continue;
      report.snapshots.push({ owner: `project ${row.projectId}`, records: changed });
      if (options.apply) await tx.update(projectPublications).set({ snapshot }).where(eq(projectPublications.projectId, row.projectId));
    }
    const pageRows = await tx.select().from(pagePublications);
    for (const row of pageRows) {
      const { snapshot, changed } = realignRecords(row.snapshot, ids, provider);
      if (!changed) continue;
      report.snapshots.push({ owner: `page ${row.pageId}`, records: changed });
      if (options.apply) await tx.update(pagePublications).set({ snapshot }).where(eq(pagePublications.pageId, row.pageId));
    }
    if (options.apply) await tx.update(media).set({ storageProvider: provider }).where(inArray(media.id, [...ids]));
  };

  if (options.apply) {
    await transaction(db, run);
    report.applied = true;
  } else {
    await run(db);
  }
  return report;
}
