import { randomUUID } from "node:crypto";
import { transaction, type Database } from "@db/client";
import { conflict, DomainError, invalid, notFound } from "@/lib/errors/domain-error";
import { getMediaStorage, mediaKeys, MediaStorageUnsupportedError } from "@/lib/storage/media-storage";
import { toMediaDto, type MediaRow } from "./media.mapper";
import { createMediaRepository, type MediaUsage } from "./media.repository";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, type ActivePictureChoice } from "./media.schema";

// The Media Library (CLAUDE.md §12, ADR-0009, ADR-0014, ADR-0015).

const VIDEO_TYPES: readonly MediaRow["type"][] = ["VIDEO", "EXTERNAL_VIDEO"];

export const isVideo = (row: Pick<MediaRow, "type">) => VIDEO_TYPES.includes(row.type);

// A poster, default or placement override, must be a live READY IMAGE and
// never the media it stands in for (ADR-0009 §4, ADR-0015 §1). The poster row
// is share-locked so it cannot be deleted while it is being referenced.
export async function assertPosterTarget(db: Database, posterId: string, forMedia: Pick<MediaRow, "id" | "type">) {
  if (!isVideo(forMedia)) {
    throw invalid("INVALID_POSTER", "Only a video can have a poster.");
  }
  if (posterId === forMedia.id) throw invalid("INVALID_POSTER", "An asset cannot be its own poster.");
  const poster = await createMediaRepository(db).findById(posterId, "share");
  if (!poster || poster.type !== "IMAGE" || poster.status !== "READY") {
    throw invalid("INVALID_POSTER", "A poster must be a ready image from the Media Library.");
  }
}

export function createMediaService(db: Database) {
  const repository = createMediaRepository(db);

  async function withPosters(rows: MediaRow[]) {
    const posters = await repository.findRowsByIds(rows.flatMap((row) => (row.posterMediaId ? [row.posterMediaId] : [])));
    const byId = new Map(posters.map((poster) => [poster.id, poster]));
    return rows.map((row) => toMediaDto(row, row.posterMediaId ? byId.get(row.posterMediaId) ?? null : null));
  }

  async function requireLive(id: string, lock?: "update" | "share") {
    const row = await repository.findById(id, lock);
    if (!row) throw notFound("MEDIA_NOT_FOUND", "Media not found.");
    return row;
  }

  return {
    async list(query: {
      type?: MediaRow["type"];
      status?: MediaRow["status"];
      search?: string;
      page: number;
      pageSize: number;
    }) {
      const { rows, total } = await repository.list(query);
      return { data: await withPosters(rows), meta: { page: query.page, pageSize: query.pageSize, total } };
    },

    async get(id: string) {
      const [dto] = await withPosters([await requireLive(id)]);
      return dto;
    },

    async update(id: string, input: { altText?: string | null; posterMediaId?: string | null; activePicture?: ActivePictureChoice }) {
      return transaction(db, async (tx) => {
        const row = await createMediaRepository(tx).findById(id, "update");
        if (!row) throw notFound("MEDIA_NOT_FOUND", "Media not found.");
        if (input.posterMediaId) await assertPosterTarget(tx, input.posterMediaId, row);
        // ADR-0016: an active picture belongs to a stored image or film; a
        // provider's player frames its own picture.
        if (input.activePicture && input.activePicture !== "FULL" && row.type === "EXTERNAL_VIDEO") {
          throw invalid("INVALID_ACTIVE_PICTURE", "An external video's player frames its own picture.");
        }
        const { activePicture, ...rest } = input;
        const updated = await createMediaRepository(tx).update(id, {
          ...rest,
          ...(activePicture === undefined ? {} : { activePicture: activePicture === "FULL" ? null : activePicture }),
        });
        const [dto] = await createMediaService(tx).withPostersFor([updated]);
        return dto;
      });
    },

    withPostersFor: withPosters,

    async usages(id: string): Promise<MediaUsage[]> {
      await requireLive(id);
      return repository.findUsages(id);
    },

    // Soft delete, refused while anything references the asset (CLAUDE.md §12).
    // The row lock makes the check and the delete atomic with respect to a
    // new reference, which share-locks the same row.
    async softDelete(id: string) {
      await transaction(db, async (tx) => {
        const media = createMediaRepository(tx);
        if (!(await media.findById(id, "update"))) throw notFound("MEDIA_NOT_FOUND", "Media not found.");
        const usages = await media.findUsages(id);
        if (usages.length) {
          throw conflict("MEDIA_IN_USE", "This media is in use and cannot be deleted.", { usages });
        }
        await media.softDelete(id);
      });
    },

    async createExternal(input: { provider: "vimeo" | "youtube"; url: string; altText?: string | null }) {
      const row = await repository.insert({
        type: "EXTERNAL_VIDEO",
        status: "READY",
        externalProvider: input.provider,
        externalUrl: input.url,
        altText: input.altText ?? null,
      });
      const [dto] = await withPosters([row]);
      return dto;
    },

    // Direct browser-to-storage upload (CLAUDE.md §12). The row and the
    // authorisation are created in one transaction: when no provider can sign
    // uploads the adapter refuses, the row is rolled back, and the honest
    // answer is 503 (ADR-0014 §6).
    async createUpload(input: {
      filename: string;
      mimeType: string;
      fileSizeBytes: number;
      checksumSha256?: string;
      altText?: string | null;
    }) {
      const type = input.mimeType.startsWith("image/") ? "IMAGE" : "VIDEO";
      const limit = type === "IMAGE" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
      if (input.fileSizeBytes > limit) {
        throw new DomainError("TOO_LARGE", "FILE_TOO_LARGE", `The file exceeds the ${limit / 1024 / 1024} MB limit.`);
      }
      return transaction(db, async (tx) => {
        const media = createMediaRepository(tx);
        if (input.checksumSha256) await assertNotDuplicate(media, input.checksumSha256);
        const storage = getMediaStorage();
        const id = randomUUID();
        const key = mediaKeys.original(id, input.filename);
        await media.insert({
          id,
          type,
          status: "UPLOADING",
          storageProvider: storage.provider,
          storageKey: key,
          filename: key.split("/").pop()!,
          originalFilename: input.filename,
          mimeType: input.mimeType,
          fileSizeBytes: input.fileSizeBytes,
          altText: input.altText ?? null,
        });
        const upload = await withStorage(() =>
          storage.createUpload({ key, mimeType: input.mimeType, byteSize: input.fileSizeBytes }),
        );
        return {
          mediaId: id,
          uploadUrl: upload.url,
          uploadMethod: upload.method,
          headers: upload.headers,
          expiresAt: upload.expiresAt.toISOString(),
        };
      });
    },

    // Verifies the stored object and makes the asset usable. Identical bytes
    // to a live asset are refused (ADR-0014 §1).
    async completeUpload(id: string) {
      return transaction(db, async (tx) => {
        const media = createMediaRepository(tx);
        const row = await media.findById(id, "update");
        if (!row) throw notFound("MEDIA_NOT_FOUND", "Media not found.");
        if (row.status !== "UPLOADING" || !row.storageKey || row.storageProvider !== getMediaStorage().provider) {
          throw conflict("INVALID_STATE", "This media is not awaiting an upload.");
        }
        const stored = await withStorage(() => getMediaStorage().verifyUpload(row.storageKey!));
        if (!stored) throw conflict("INVALID_STATE", "The uploaded file was not found in storage.");
        if (stored.checksumSha256) await assertNotDuplicate(media, stored.checksumSha256);
        const updated = await media.markUploaded(id, {
          fileSizeBytes: stored.byteSize,
          checksumSha256: stored.checksumSha256 ?? null,
          mimeType: stored.mimeType ?? row.mimeType,
        });
        const [dto] = await createMediaService(tx).withPostersFor([updated]);
        return dto;
      });
    },
  };
}

async function assertNotDuplicate(media: ReturnType<typeof createMediaRepository>, checksum: string) {
  const existing = await media.findByChecksum(checksum);
  if (existing) {
    throw conflict("MEDIA_DUPLICATE", "This file is already in the Media Library.", { mediaId: existing.id });
  }
}

async function withStorage<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof MediaStorageUnsupportedError) throw storageUnavailable();
    throw error;
  }
}

const storageUnavailable = () =>
  new DomainError(
    "UNAVAILABLE",
    "STORAGE_UNAVAILABLE",
    "Uploads need a storage provider, and none is configured yet. Existing media can still be used.",
  );

export type MediaService = ReturnType<typeof createMediaService>;
