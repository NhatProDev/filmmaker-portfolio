import type { Media as MediaRow } from "@db/schema";
import { getMediaStorage, isPrivateKey } from "@/lib/storage/media-storage";
import { mediaUrl } from "@/lib/storage/media-url";

// Media DTOs (openapi.yaml). Delivery URLs are derived here, at read time, from
// provider + key (ADR-0014); they are never stored or accepted as input.

export type { MediaRow };

// A private object has no public URL (media-storage.ts); the Studio shows it
// without a preview until it has an access-checked route of its own.
export function deliveryUrl(row: Pick<MediaRow, "type" | "status" | "storageProvider" | "storageKey">): string | null {
  if (row.type === "EXTERNAL_VIDEO" || row.status !== "READY" || !row.storageKey) return null;
  if (row.storageProvider !== getMediaStorage().provider || isPrivateKey(row.storageKey)) return null;
  return mediaUrl(row.storageKey);
}

export function toMediaRef(row: MediaRow) {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    deliveryUrl: deliveryUrl(row),
    width: row.width,
    height: row.height,
    altText: row.altText,
  };
}

export type MediaRefDto = ReturnType<typeof toMediaRef>;

// `poster` is resolved one level only: a poster's own poster is never
// serialised (ADR-0009).
export function toMediaDto(row: MediaRow, poster: MediaRow | null) {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    storageProvider: row.storageProvider,
    storageKey: row.storageKey,
    deliveryUrl: deliveryUrl(row),
    thumbnailUrl: row.thumbnailUrl,
    externalProvider: row.externalProvider as "vimeo" | "youtube" | null,
    externalUrl: row.externalUrl,
    filename: row.filename,
    originalFilename: row.originalFilename,
    mimeType: row.mimeType,
    width: row.width,
    height: row.height,
    durationMs: row.durationMs,
    fileSizeBytes: row.fileSizeBytes,
    checksumSha256: row.checksumSha256,
    altText: row.altText,
    posterMediaId: row.posterMediaId,
    // ADR-0016: where the picture sits in a letterboxed file; FULL when unset.
    activePicture: row.activePicture ?? "FULL",
    poster: poster ? toMediaRef(poster) : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type MediaDto = ReturnType<typeof toMediaDto>;
