import { sql } from "drizzle-orm";
import type { Database } from "@db/client";
import type { ListedObject } from "@/lib/storage/media-storage";

// The media lifecycle audit (docs/operations/media-lifecycle.md). It compares
// what the buckets hold with everything that could still need an object, and
// names what is safe to remove. It is conservative by construction: an object
// is a candidate only when no reference of any kind can be found, and the
// decision is made from one consistent read of the database.
//
// What keeps an object (any one is enough):
//   LIVE_ASSET        a media row that is not soft-deleted names its key
//   REFERENCED_ASSET  a soft-deleted row still referenced relationally —
//                     cover, preview, placement, poster (asset or placement),
//                     page slot, album item or cover, or a current snapshot;
//                     owners that are archived or soft-deleted still count
//   DOCUMENT          the key appears in a snapshot, a page's content or a
//                     block's content (belt and braces: §6 keeps media out of
//                     JSON, but a published snapshot is never second-guessed)
//   STATIC_CONTENT    committed static content uses it (the fallback site)
//   RECENT            no reference, but younger than the grace period
//   MISPLACED         a private/ key in the public bucket, or the reverse:
//                     reported for a person, never removed automatically
//
// What makes an object a candidate:
//   PROBE             an operations probe (_probe/) older than an hour
//   ABANDONED_UPLOAD  its only rows are uploads never completed, older than
//                     the abandonment window
//   DELETED_ASSET     its only rows are soft-deleted and unreferenced, and
//                     deleted longer ago than the grace period
//   ORPHAN            no row names it at all, older than the grace period

export type GcRow = {
  id: string;
  status: string;
  storageKey: string | null;
  // Keys behind the row's legacy url / thumbnail_url, already resolved.
  urlKeys: string[];
  deletedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
};

export type GcInput = {
  objects: ListedObject[];
  rows: GcRow[];
  // Every media id any relational reference names, from live or deleted owners.
  referencedMediaIds: ReadonlySet<string>;
  // Snapshot, page-content and block-content JSON, as text.
  documents: readonly string[];
  staticKeys: ReadonlySet<string>;
  now: Date;
  graceDays: number;
  abandonedHours: number;
};

export type KeepReason = "LIVE_ASSET" | "REFERENCED_ASSET" | "DOCUMENT" | "STATIC_CONTENT" | "RECENT" | "MISPLACED";
export type CandidateReason = "PROBE" | "ABANDONED_UPLOAD" | "DELETED_ASSET" | "ORPHAN";

export type GcObject = { audience: ListedObject["audience"]; key: string; byteSize: number; lastModified: string };

export type GcReport = {
  version: 1;
  generatedAt: string;
  policy: { graceDays: number; abandonedHours: number };
  summary: {
    objects: { public: number; private: number };
    kept: Record<KeepReason, number>;
    candidates: Record<CandidateReason, number>;
    candidateBytes: number;
    abandonedRows: number;
    missingObjects: number;
  };
  // Objects safe to remove, sorted by audience then key.
  candidates: (GcObject & { reason: CandidateReason; mediaIds: string[] })[];
  // Uploads never completed, past the window: rows to soft-delete.
  abandonedRows: { id: string; storageKey: string | null; createdAt: string }[];
  // Kept for a reason a person should look at.
  attention: (GcObject & { reason: "RECENT" | "MISPLACED" })[];
  // Live rows whose object no bucket holds (db:health names them too).
  missingObjects: { id: string; storageKey: string }[];
};

const HOUR = 60 * 60 * 1000;
// postgres.js returns rows as an array; PGlite wraps them in { rows }.
const rowsOf = <T,>(result: unknown): T[] => (Array.isArray(result) ? (result as T[]) : ((result as { rows?: T[] }).rows ?? []));
const isProbe = (key: string) => key.startsWith("_probe/") || key.startsWith("private/_probe/");
const inRightBucket = (object: ListedObject) => (object.audience === "private") === object.key.startsWith("private/");

export function planMediaGc(input: GcInput): GcReport {
  const { now, graceDays, abandonedHours } = input;
  const graceMs = graceDays * 24 * HOUR;
  const rowsByKey = new Map<string, GcRow[]>();
  for (const row of input.rows) {
    for (const key of new Set([row.storageKey, ...row.urlKeys].filter((k): k is string => Boolean(k)))) {
      rowsByKey.set(key, [...(rowsByKey.get(key) ?? []), row]);
    }
  }
  const abandoned = (row: GcRow) =>
    row.status === "UPLOADING" && !row.deletedAt && !input.referencedMediaIds.has(row.id) && now.getTime() - row.createdAt.getTime() > abandonedHours * HOUR;
  const retains = (row: GcRow) => (!row.deletedAt && !abandoned(row)) || input.referencedMediaIds.has(row.id);
  const inDocuments = (key: string) => input.documents.some((text) => text.includes(key));

  const kept = { LIVE_ASSET: 0, REFERENCED_ASSET: 0, DOCUMENT: 0, STATIC_CONTENT: 0, RECENT: 0, MISPLACED: 0 } satisfies Record<KeepReason, number>;
  const counts = { PROBE: 0, ABANDONED_UPLOAD: 0, DELETED_ASSET: 0, ORPHAN: 0 } satisfies Record<CandidateReason, number>;
  const candidates: GcReport["candidates"] = [];
  const attention: GcReport["attention"] = [];
  const objects = [...input.objects].sort((a, b) => (a.audience + a.key < b.audience + b.key ? -1 : a.audience + a.key > b.audience + b.key ? 1 : 0));
  const present = new Set(objects.map((object) => object.key));

  for (const object of objects) {
    const view: GcObject = { audience: object.audience, key: object.key, byteSize: object.byteSize, lastModified: object.lastModified.toISOString() };
    const age = now.getTime() - object.lastModified.getTime();
    const rows = rowsByKey.get(object.key) ?? [];
    const keep = (reason: KeepReason) => {
      kept[reason] += 1;
      if (reason === "RECENT" || reason === "MISPLACED") attention.push({ ...view, reason });
    };
    const candidate = (reason: CandidateReason) => {
      counts[reason] += 1;
      candidates.push({ ...view, reason, mediaIds: rows.map((row) => row.id).sort() });
    };

    if (!inRightBucket(object)) keep("MISPLACED");
    else if (isProbe(object.key)) {
      if (age > HOUR) candidate("PROBE");
      else keep("RECENT");
    } else if (rows.some((row) => !row.deletedAt && !abandoned(row))) keep("LIVE_ASSET");
    else if (rows.some((row) => input.referencedMediaIds.has(row.id))) keep("REFERENCED_ASSET");
    else if (input.staticKeys.has(object.key)) keep("STATIC_CONTENT");
    else if (inDocuments(object.key)) keep("DOCUMENT");
    else if (rows.length && rows.every(abandoned)) candidate("ABANDONED_UPLOAD");
    else if (rows.length) {
      // Soft-deleted and unreferenced: removable once the grace period has
      // passed since the deletion (updated_at moves with deleted_at).
      const deletedLongAgo = rows.every((row) => row.deletedAt && now.getTime() - row.deletedAt.getTime() > graceMs);
      if (deletedLongAgo && age > graceMs) candidate("DELETED_ASSET");
      else keep("RECENT");
    } else if (age > graceMs) candidate("ORPHAN");
    else keep("RECENT");
  }

  const abandonedRows = input.rows
    .filter(abandoned)
    .map((row) => ({ id: row.id, storageKey: row.storageKey, createdAt: row.createdAt.toISOString() }))
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  const missingObjects = input.rows
    .filter((row) => retains(row) && row.status !== "UPLOADING" && row.storageKey && !present.has(row.storageKey))
    .map((row) => ({ id: row.id, storageKey: row.storageKey! }))
    .sort((a, b) => (a.storageKey < b.storageKey ? -1 : 1));

  return {
    version: 1,
    generatedAt: now.toISOString(),
    policy: { graceDays, abandonedHours },
    summary: {
      objects: {
        public: input.objects.filter((o) => o.audience === "public").length,
        private: input.objects.filter((o) => o.audience === "private").length,
      },
      kept,
      candidates: counts,
      candidateBytes: candidates.reduce((n, c) => n + c.byteSize, 0),
      abandonedRows: abandonedRows.length,
      missingObjects: missingObjects.length,
    },
    candidates,
    abandonedRows,
    attention,
    missingObjects,
  };
}

// Everything planMediaGc needs from the database, read in one read-only,
// repeatable-read transaction so that every reference comes from one moment.
export async function readGcReferences(db: Database, keyFromUrl: (url: string) => string | null) {
  return db.transaction(
    async (tx) => {
      const rows = rowsOf<{
        id: string;
        status: string;
        storage_key: string | null;
        url: string | null;
        thumbnail_url: string | null;
        deleted_at: Date | string | null;
        updated_at: Date | string;
        created_at: Date | string;
      }>(await tx.execute(sql`select id, status, storage_key, url, thumbnail_url, deleted_at, updated_at, created_at from media`));
      const referenced = rowsOf<{ id: string }>(await tx.execute(sql`
        select cover_media_id as id from projects where cover_media_id is not null
        union select preview_media_id from projects where preview_media_id is not null
        union select media_id from block_media
        union select poster_media_id from block_media where poster_media_id is not null
        union select poster_media_id from media where poster_media_id is not null
        union select media_id from page_media
        union select media_id from album_media
        union select cover_media_id from albums where cover_media_id is not null
        union select media_id from publication_media`));
      const documents = rowsOf<{ text: string }>(await tx.execute(sql`
        select snapshot::text as text from project_publications
        union all select snapshot::text from page_publications
        union all select snapshot::text from album_publications
        union all select content::text from pages
        union all select content::text from project_blocks`));
      const date = (value: Date | string) => (value instanceof Date ? value : new Date(value));
      return {
        rows: rows.map(
          (row): GcRow => ({
            id: row.id,
            status: row.status,
            storageKey: row.storage_key,
            urlKeys: [row.url, row.thumbnail_url].flatMap((url) => (url ? [keyFromUrl(url)].filter((k): k is string => Boolean(k)) : [])),
            deletedAt: row.deleted_at ? date(row.deleted_at) : null,
            updatedAt: date(row.updated_at),
            createdAt: date(row.created_at),
          }),
        ),
        referencedMediaIds: new Set(referenced.map((row) => row.id)),
        documents: documents.map((row) => row.text),
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

export function formatGcReport(report: GcReport): string {
  const s = report.summary;
  const lines = [
    `objects   public ${s.objects.public}, private ${s.objects.private}`,
    `kept      ${Object.entries(s.kept).map(([k, v]) => `${k} ${v}`).join(", ")}`,
    `remove    ${Object.entries(s.candidates).map(([k, v]) => `${k} ${v}`).join(", ")}  (${s.candidateBytes} bytes)`,
    `rows      ${s.abandonedRows} abandoned upload(s) to soft-delete; ${s.missingObjects} live row(s) without an object`,
  ];
  for (const c of report.candidates) lines.push(`  REMOVE ${c.reason.padEnd(16)} ${c.audience.padEnd(7)} ${c.key}  (${c.byteSize} B, ${c.lastModified})`);
  for (const r of report.abandonedRows) lines.push(`  ROW    ABANDONED_UPLOAD ${r.id}  ${r.storageKey ?? "(no key)"}  (${r.createdAt})`);
  for (const a of report.attention) lines.push(`  NOTE   ${a.reason.padEnd(16)} ${a.audience.padEnd(7)} ${a.key}  (${a.lastModified})`);
  for (const m of report.missingObjects) lines.push(`  MISSING                 ${m.storageKey}  (media ${m.id})`);
  return lines.join("\n");
}
