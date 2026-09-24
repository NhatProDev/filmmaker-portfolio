import { asc } from "drizzle-orm";
import type { Database } from "@db/client";
import { media, projects } from "@db/schema";
import { createMediaRepository, type MediaUsage } from "@/features/media/media.repository";
import { isPrivateKey, mediaKeys } from "@/lib/storage/media-storage";
import type { Placement } from "./static-import";
import type { ProbedMedia } from "./media-probe";

// The production media manifest (docs/operations/media-migration.md): a
// deterministic, read-only account of every media file the site needs, where
// it is now, where it goes, and who may see it. Nothing is moved, deleted or
// re-encoded; the manifest is what a later, explicit migration executes.
//
// Audience, from relational references only (CLAUDE.md §12):
//   public        used by a page, by a PUBLIC project (draft or published), by
//                 committed static content, or as the poster of a public asset
//   private       used only by PRIVATE projects, or as their assets' posters
//   unreferenced  used by nothing; soft-deleted assets are always this
// A PUBLIC draft counts as public: publishing it must not need a file move.
//
// Future storage key: a public asset keeps its key (its CDN path is stable);
// a private asset moves under private/ (media-storage.ts), which is never
// publicly addressable.

export type Audience = "public" | "private" | "unreferenced";

export type ManifestUsage = { kind: MediaUsage["kind"] | "STATIC_CONTENT"; owner: string; audience: "public" | "private" };

export type ManifestEntry = {
  // The canonical media id, or null for a file only committed static content
  // references (About, Contact).
  id: string | null;
  origin: "database" | "static-content";
  type: "IMAGE" | "VIDEO" | "EXTERNAL_VIDEO";
  status: string | null;
  deleted: boolean;
  checksumSha256: string | null;
  source: { provider: string | null; key: string | null; path: string | null; exists: boolean; byteSize: number | null; sha256: string | null };
  audience: Audience;
  // Whether production needs this file: every referenced database asset, and
  // a static-content file only when a page that stays static uses it (About,
  // Contact) — the imported pages read the database's assets instead.
  deploy: boolean;
  target: { bucket: "public" | "private"; key: string } | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  posters: { defaultPosterId: string | null; defaultPosterOf: string[]; placementPosterUses: number };
  usages: ManifestUsage[];
};

export type MediaManifest = {
  version: 1;
  summary: {
    entries: number;
    deploy: number;
    database: number;
    staticContent: number;
    public: number;
    private: number;
    unreferenced: number;
    missingFiles: number;
    duplicates: number;
    collisions: number;
    mismatches: number;
    bytesToUpload: { public: number; private: number };
  };
  entries: ManifestEntry[];
  duplicates: { sha256: string; entries: string[] }[];
  missing: string[];
  collisions: { targetKey: string; entries: string[] }[];
  mismatches: string[];
};

type ProjectInfo = { slug: string; visibility: "PUBLIC" | "PRIVATE" };

const label = (entry: Pick<ManifestEntry, "id" | "source">) => entry.id ?? `static:${entry.source.key}`;

function usageOf(usage: MediaUsage, projectsById: Map<string, ProjectInfo>): ManifestUsage | null {
  const project = (id: string | null) => (id ? projectsById.get(id) : undefined);
  switch (usage.kind) {
    case "PROJECT_COVER":
    case "PROJECT_PREVIEW":
    case "PUBLISHED_PROJECT": {
      const info = project(usage.projectId);
      if (!info) return null;
      return { kind: usage.kind, owner: `project:${info.slug}`, audience: info.visibility === "PRIVATE" ? "private" : "public" };
    }
    case "BLOCK_MEDIA":
    case "PLACEMENT_POSTER": {
      if (usage.pageKey) return { kind: usage.kind, owner: `page:${usage.pageKey}`, audience: "public" };
      const info = project(usage.projectId);
      if (!info) return null;
      return { kind: usage.kind, owner: `project:${info.slug}`, audience: info.visibility === "PRIVATE" ? "private" : "public" };
    }
    case "PUBLISHED_PAGE":
    case "PAGE_MEDIA":
      return { kind: usage.kind, owner: `page:${usage.pageKey}`, audience: "public" };
    case "ASSET_POSTER":
      // Resolved from the video's audience below.
      return null;
  }
}

export async function buildMediaManifest(input: {
  db: Database | null;
  staticPlacements: readonly Placement[];
  // The bytes behind a key under the current (local) storage, or null when
  // the provider keeps them elsewhere.
  pathFor: (provider: string | null, key: string) => string | null;
  probe: (path: string) => Promise<ProbedMedia>;
}): Promise<MediaManifest> {
  const entries: ManifestEntry[] = [];
  const probed = new Map<string, ProbedMedia>();
  const probeOnce = async (path: string) => {
    if (!probed.has(path)) probed.set(path, await input.probe(path));
    return probed.get(path)!;
  };
  const source = async (provider: string | null, key: string | null) => {
    const path = key ? input.pathFor(provider, key) : null;
    const file = path ? await probeOnce(path) : null;
    return {
      provider,
      key,
      path,
      exists: Boolean(file?.exists),
      byteSize: file?.exists ? file.byteSize : null,
      sha256: file?.exists ? file.sha256 : null,
    };
  };

  // ---- Database assets ----
  const byKey = new Map<string, ManifestEntry>();
  const posterOf = new Map<string, string[]>();
  if (input.db) {
    const rows = await input.db.select().from(media).orderBy(asc(media.id));
    const projectRows = await input.db
      .select({ id: projects.id, slug: projects.slug, visibility: projects.visibility })
      .from(projects);
    const projectsById = new Map(projectRows.map((row) => [row.id, row]));
    const repository = createMediaRepository(input.db);
    for (const row of rows) {
      if (row.posterMediaId && !row.deletedAt) {
        posterOf.set(row.posterMediaId, [...(posterOf.get(row.posterMediaId) ?? []), row.id]);
      }
    }
    for (const row of rows) {
      const deleted = row.deletedAt !== null;
      const raw = deleted ? [] : await repository.findUsages(row.id);
      const usages = raw
        .map((usage) => usageOf(usage, projectsById))
        .filter((usage): usage is ManifestUsage => usage !== null);
      const entry: ManifestEntry = {
        id: row.id,
        origin: "database",
        type: row.type,
        status: row.status,
        deleted,
        checksumSha256: row.checksumSha256,
        source: await source(row.storageProvider, row.storageKey),
        audience: "unreferenced",
        deploy: false,
        target: null,
        mimeType: row.mimeType,
        width: row.width,
        height: row.height,
        durationMs: row.durationMs,
        posters: {
          defaultPosterId: row.posterMediaId,
          defaultPosterOf: (posterOf.get(row.id) ?? []).sort(),
          placementPosterUses: raw.filter((usage) => usage.kind === "PLACEMENT_POSTER").length,
        },
        usages: usages.sort((a, b) => `${a.kind}${a.owner}`.localeCompare(`${b.kind}${b.owner}`)),
      };
      entries.push(entry);
      if (row.storageKey && !deleted) byKey.set(row.storageKey, entry);
    }
  }

  // ---- Committed static content (About, Contact, and every page in static mode) ----
  const staticUses = new Map<string, Placement[]>();
  for (const placement of input.staticPlacements) {
    staticUses.set(placement.key, [...(staticUses.get(placement.key) ?? []), placement]);
  }
  for (const [key, placements] of [...staticUses].sort(([a], [b]) => a.localeCompare(b))) {
    const usages = placements.map((p) => ({ kind: "STATIC_CONTENT" as const, owner: p.source, audience: "public" as const }));
    const existing = byKey.get(key);
    if (existing) {
      // With a database, the imported pages read its compositions, so only
      // the pages that stay static (About, Contact) add a use.
      const kept = input.db ? usages.filter((_, i) => !placements[i].imported) : usages;
      existing.usages.push(...kept);
      continue;
    }
    const file = await source("local", key);
    const probe = file.path ? probed.get(file.path) : undefined;
    entries.push({
      id: null,
      origin: "static-content",
      type: placements[0].kind,
      status: null,
      deleted: false,
      checksumSha256: null,
      source: file,
      audience: "public",
      // Without a database every page is static content.
      deploy: !input.db || placements.some((p) => !p.imported),
      target: null,
      mimeType: probe?.exists ? probe.mimeType : null,
      width: probe?.exists ? probe.width : null,
      height: probe?.exists ? probe.height : null,
      durationMs: probe?.exists ? probe.durationMs : null,
      posters: { defaultPosterId: null, defaultPosterOf: [], placementPosterUses: 0 },
      usages,
    });
  }

  // ---- Audience, with posters inheriting from the videos they stand for ----
  const byId = new Map(entries.filter((e) => e.id).map((e) => [e.id!, e]));
  const direct = (entry: ManifestEntry): Audience => {
    if (entry.deleted) return "unreferenced";
    if (entry.usages.some((u) => u.audience === "public")) return "public";
    return entry.usages.length ? "private" : "unreferenced";
  };
  for (const entry of entries) entry.audience = direct(entry);
  for (let changed = true; changed; ) {
    changed = false;
    for (const entry of entries) {
      if (entry.deleted) continue;
      for (const videoId of entry.posters.defaultPosterOf) {
        const video = byId.get(videoId)!;
        const next: Audience =
          entry.audience === "public" || video.audience === "public"
            ? "public"
            : entry.audience === "private" || video.audience === "private"
              ? "private"
              : entry.audience;
        if (next !== entry.audience) {
          entry.audience = next;
          changed = true;
        }
      }
    }
  }

  // ---- Targets ----
  for (const entry of entries) {
    if (entry.origin === "database") entry.deploy = entry.audience !== "unreferenced" && entry.type !== "EXTERNAL_VIDEO";
    if (!entry.deploy || !entry.source.key) continue;
    const current = entry.source.key;
    const bare = isPrivateKey(current) ? current.slice("private/".length) : current;
    entry.target =
      entry.audience === "private" ? { bucket: "private", key: mediaKeys.private(bare) } : { bucket: "public", key: bare };
  }

  // ---- Findings ----
  const missing = entries
    .filter((e) => e.deploy && e.source.path && !e.source.exists)
    .map((e) => `${label(e)}: ${e.source.key} (${e.source.path})`);

  const bySha = new Map<string, string[]>();
  for (const entry of entries) {
    if (!entry.source.sha256 || !entry.deploy) continue;
    bySha.set(entry.source.sha256, [...(bySha.get(entry.source.sha256) ?? []), label(entry)]);
  }
  const duplicates = [...bySha]
    .filter(([, ids]) => ids.length > 1)
    .map(([sha256, ids]) => ({ sha256, entries: ids.sort() }))
    .sort((a, b) => a.sha256.localeCompare(b.sha256));

  // Two files may not land on one key, even on a case-insensitive store.
  const byTarget = new Map<string, string[]>();
  for (const entry of entries) {
    if (!entry.target) continue;
    const slot = `${entry.target.bucket}:${entry.target.key.toLowerCase()}`;
    byTarget.set(slot, [...(byTarget.get(slot) ?? []), label(entry)]);
  }
  const collisions = [...byTarget]
    .filter(([, ids]) => ids.length > 1)
    .map(([targetKey, ids]) => ({ targetKey, entries: ids.sort() }))
    .sort((a, b) => a.targetKey.localeCompare(b.targetKey));

  const mismatches: string[] = [];
  for (const entry of entries) {
    const file = entry.source.path ? probed.get(entry.source.path) : undefined;
    if (!file?.exists || entry.origin !== "database") continue;
    if (entry.checksumSha256 && entry.checksumSha256 !== file.sha256) {
      mismatches.push(`${label(entry)}: recorded checksum ${entry.checksumSha256.slice(0, 12)}… but the file is ${file.sha256.slice(0, 12)}…`);
    }
    if (entry.width && file.width && (entry.width !== file.width || entry.height !== file.height)) {
      mismatches.push(`${label(entry)}: recorded ${entry.width}×${entry.height} but the file is ${file.width}×${file.height}`);
    }
    if (entry.mimeType && entry.mimeType !== file.mimeType) {
      mismatches.push(`${label(entry)}: recorded ${entry.mimeType} but the file is ${file.mimeType}`);
    }
  }

  entries.sort((a, b) => a.origin.localeCompare(b.origin) || label(a).localeCompare(label(b)));
  const bytes = (audience: "public" | "private") =>
    entries.filter((e) => e.target?.bucket === audience).reduce((sum, e) => sum + (e.source.byteSize ?? 0), 0);

  return {
    version: 1,
    summary: {
      entries: entries.length,
      deploy: entries.filter((e) => e.deploy).length,
      database: entries.filter((e) => e.origin === "database").length,
      staticContent: entries.filter((e) => e.origin === "static-content").length,
      public: entries.filter((e) => e.audience === "public").length,
      private: entries.filter((e) => e.audience === "private").length,
      unreferenced: entries.filter((e) => e.audience === "unreferenced").length,
      missingFiles: missing.length,
      duplicates: duplicates.length,
      collisions: collisions.length,
      mismatches: mismatches.length,
      bytesToUpload: { public: bytes("public"), private: bytes("private") },
    },
    entries,
    duplicates,
    missing,
    collisions,
    mismatches,
  };
}

const mb = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`;

export function formatManifestSummary(manifest: MediaManifest): string {
  const s = manifest.summary;
  const lines = [
    `Media manifest (dry run — nothing is moved, deleted or re-encoded)`,
    `  entries        ${s.entries}  (database ${s.database}, static content ${s.staticContent}); to deploy ${s.deploy}`,
    `  audience       public ${s.public} · private ${s.private} · unreferenced ${s.unreferenced}`,
    `  to upload      public ${mb(s.bytesToUpload.public)} · private ${mb(s.bytesToUpload.private)}`,
    `  missing files  ${s.missingFiles}`,
    `  duplicates     ${s.duplicates}`,
    `  collisions     ${s.collisions}`,
    `  mismatches     ${s.mismatches}`,
  ];
  const section = (title: string, items: string[]) => {
    if (items.length) lines.push("", title, ...items.map((item) => `  - ${item}`));
  };
  section("Missing files", manifest.missing);
  section("Duplicate content among deployed files (same bytes, more than one entry)", manifest.duplicates.map((d) => `${d.sha256.slice(0, 12)}…  ${d.entries.join(", ")}`));
  section("Target collisions", manifest.collisions.map((c) => `${c.targetKey}  ${c.entries.join(", ")}`));
  section("Recorded metadata that differs from the file", manifest.mismatches);
  section(
    "Private assets (move under private/)",
    manifest.entries.filter((e) => e.audience === "private").map((e) => `${e.id}  ${e.source.key} → ${e.target?.key}`),
  );
  section(
    "Unreferenced",
    manifest.entries.filter((e) => e.audience === "unreferenced").map((e) => `${label(e)}  ${e.source.key ?? "(no key)"}${e.deleted ? " (deleted)" : ""}`),
  );
  return lines.join("\n");
}
