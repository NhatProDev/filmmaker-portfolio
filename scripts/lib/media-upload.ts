import type { ManifestEntry, MediaManifest } from "./media-manifest";

// The media upload plan (docs/operations/media-migration.md §3): which
// manifest entries go to which bucket, and what to do with each given what
// storage already holds. Create-only: an object that exists with other bytes
// is a conflict to resolve by hand, never overwritten.

export type UploadItem = {
  label: string;
  bucket: "public" | "private";
  key: string;
  path: string;
  byteSize: number;
  sha256: string;
  mimeType: string;
  cacheControl: string;
};

// Keys are content-stable: a new file gets a new key (originals/<mediaId>/…).
export const CACHE_CONTROL = {
  public: "public, max-age=31536000, immutable",
  // Delivered only through short-lived signed URLs.
  private: "private, max-age=0",
} as const;

export function uploadItems(manifest: MediaManifest): { items: UploadItem[]; problems: string[] } {
  const items: UploadItem[] = [];
  const problems: string[] = [];
  const seen = new Map<string, string>();
  const describe = (entry: ManifestEntry) => entry.id ?? `static:${entry.source.key}`;
  for (const entry of manifest.entries) {
    if (!entry.deploy) continue;
    const label = describe(entry);
    const { target, source, mimeType } = entry;
    if (!target) {
      problems.push(`${label}: deployed but has no target`);
      continue;
    }
    if (!source.exists || !source.path || source.byteSize === null || !source.sha256) {
      problems.push(`${label}: source file missing`);
      continue;
    }
    if (!mimeType) {
      problems.push(`${label}: no MIME type`);
      continue;
    }
    const slot = `${target.bucket}:${target.key}`;
    const previous = seen.get(slot);
    if (previous !== undefined) {
      // Two entries may share a target only with the same bytes.
      if (previous !== source.sha256) problems.push(`${label}: target ${slot} collides with other content`);
      continue;
    }
    seen.set(slot, source.sha256);
    items.push({
      label,
      bucket: target.bucket,
      key: target.key,
      path: source.path,
      byteSize: source.byteSize,
      sha256: source.sha256,
      mimeType,
      cacheControl: CACHE_CONTROL[target.bucket],
    });
  }
  return { items, problems };
}

export type RemoteObject = { byteSize: number; etag: string | null } | null;

export type UploadDecision = "upload" | "unchanged" | "conflict";

// A single-part upload's ETag is the MD5 of its bytes (S3 and R2). A
// multipart ETag ("…-N") cannot be compared, so it is a conflict too.
export function decideUpload(local: { byteSize: number; md5: string }, remote: RemoteObject): UploadDecision {
  if (!remote) return "upload";
  const etag = remote.etag?.replace(/^W\//, "").replace(/"/g, "").toLowerCase() ?? null;
  return remote.byteSize === local.byteSize && etag === local.md5.toLowerCase() ? "unchanged" : "conflict";
}
