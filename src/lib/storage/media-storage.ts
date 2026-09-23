import { serverEnv } from "@/lib/env/server-env";

// The storage boundary (ADR-0014). Domain code works with storage keys; only an
// adapter knows how a key becomes a delivery URL, how a browser uploads to it
// directly, and how an object is removed. No provider is chosen yet: the only
// adapter is `local`, which serves keys from public/media.

export type SignedUpload = {
  url: string;
  method: "PUT" | "POST";
  // Headers the browser must send with the upload.
  headers: Record<string, string>;
  expiresAt: Date;
};

export type StoredObject = {
  key: string;
  byteSize: number;
  mimeType?: string;
  checksumSha256?: string;
};

export interface MediaStorage {
  readonly provider: string;
  // The delivery URL for a publicly deliverable object.
  publicUrl(key: string): string;
  // Authorises one direct browser-to-storage upload of an original.
  createUpload(input: { key: string; mimeType: string; byteSize: number }): Promise<SignedUpload>;
  // Confirms that an upload arrived; null when the object does not exist.
  verifyUpload(key: string): Promise<StoredObject | null>;
  // Removes an object. Media deletion is soft in the database; objects are
  // removed later, only once nothing references the asset.
  deleteObject(key: string): Promise<void>;
}

export class MediaStorageUnsupportedError extends Error {}

const safeFilename = (filename: string) =>
  filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "file";

// Key layout for uploaded media: originals and their derivatives are separate.
export const mediaKeys = {
  original: (mediaId: string, filename: string) => `originals/${mediaId}/${safeFilename(filename)}`,
  variant: (mediaId: string, kind: string, extension: string) => `variants/${mediaId}/${kind}.${extension}`,
};

export function createLocalMediaStorage(baseUrl: string): MediaStorage {
  const unsupported = async (): Promise<never> => {
    throw new MediaStorageUnsupportedError(
      "The local media storage adapter serves existing files only; uploads need a storage provider (ADR-0014).",
    );
  };
  return {
    provider: "local",
    publicUrl: (key) => `${baseUrl}/${key}`,
    createUpload: unsupported,
    verifyUpload: unsupported,
    deleteObject: unsupported,
  };
}

let storage: MediaStorage | undefined;

// Tests exercise the upload flow against a fake provider.
export function setMediaStorageForTesting(adapter: MediaStorage | undefined) {
  storage = adapter;
}

export function getMediaStorage(): MediaStorage {
  storage ??= createLocalMediaStorage(serverEnv().MEDIA_PUBLIC_BASE_URL);
  return storage;
}
