import { join, resolve, sep } from "node:path";
import { serverEnv, type ServerEnv } from "@/lib/env/server-env";
import { assertMediaKey } from "./media-url";
import { presignS3, type S3Location } from "./s3-presign";

// The storage boundary (ADR-0014). Domain code works with storage keys; only an
// adapter knows how a key becomes a delivery URL, how a browser uploads to it
// directly, and how an object is removed.
//
// Two audiences, told apart by the key alone:
//
//   public   <key>            → a public delivery URL (CDN / public/media)
//   private  private/<key>    → never publicly addressable; delivered only
//                               behind the project-access check, as a
//                               short-lived signed URL or streamed by the app
//
// Adapters:
//   local  public keys from public/media (Next.js serves them); private keys
//          from MEDIA_PRIVATE_ROOT, a directory outside public/. No uploads.
//   s3     any S3-compatible store (Cloudflare R2, AWS S3): a public bucket
//          behind MEDIA_PUBLIC_BASE_URL and a private bucket, SigV4 presigned
//          URLs for uploads and private delivery.

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

export const PRIVATE_KEY_PREFIX = "private/";

export const isPrivateKey = (key: string) => key.startsWith(PRIVATE_KEY_PREFIX);

export class PrivateMediaKeyError extends Error {
  constructor(key: string) {
    super(`A private media key has no public URL: ${key}`);
  }
}

export interface MediaStorage {
  readonly provider: string;
  // The delivery URL for a publicly deliverable object. Throws
  // PrivateMediaKeyError for a private key.
  publicUrl(key: string): string;
  // A short-lived URL a browser may fetch the object from directly, or null
  // when the adapter cannot issue one and the application must stream the
  // bytes itself (localPath). Callers authorise the visitor first.
  signedDeliveryUrl(key: string, expiresInSeconds: number): string | null;
  // Where an adapter that keeps objects on this server's disk holds a key's
  // bytes; null for remote storage.
  localPath(key: string): string | null;
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

// Key layout for uploaded media: originals and their derivatives are separate,
// and a private asset's keys sit under the private prefix.
export const mediaKeys = {
  original: (mediaId: string, filename: string) => `originals/${mediaId}/${safeFilename(filename)}`,
  variant: (mediaId: string, kind: string, extension: string) => `variants/${mediaId}/${kind}.${extension}`,
  private: (key: string) => (isPrivateKey(key) ? key : `${PRIVATE_KEY_PREFIX}${key}`),
};

// A key's path under a root directory, refusing anything that could leave it.
function pathUnder(root: string, key: string): string {
  assertMediaKey(key);
  if (/[\\:\0]/.test(key)) throw new Error(`Not a portable media key: ${key}`);
  const base = resolve(root);
  const path = join(base, ...key.split("/"));
  if (!path.startsWith(base + sep)) throw new Error(`Media key escapes its root: ${key}`);
  return path;
}

export function createLocalMediaStorage(
  baseUrl: string,
  roots: { public: string; private: string } = {
    public: join(/*turbopackIgnore: true*/ process.cwd(), "public", "media"),
    private: join(/*turbopackIgnore: true*/ process.cwd(), "storage", "private"),
  },
): MediaStorage {
  const unsupported = async (): Promise<never> => {
    throw new MediaStorageUnsupportedError(
      "The local media storage adapter serves existing files only; uploads need a storage provider (ADR-0014).",
    );
  };
  return {
    provider: "local",
    publicUrl: (key) => {
      if (isPrivateKey(key)) throw new PrivateMediaKeyError(key);
      return `${baseUrl}/${key}`;
    },
    // The local adapter has no signer: the access-checked route streams.
    signedDeliveryUrl: () => null,
    localPath: (key) =>
      isPrivateKey(key) ? pathUnder(roots.private, key.slice(PRIVATE_KEY_PREFIX.length)) : pathUnder(roots.public, key),
    createUpload: unsupported,
    verifyUpload: unsupported,
    deleteObject: unsupported,
  };
}

export type S3Config = {
  endpoint: string;
  region: string;
  publicBucket: string;
  privateBucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  pathStyle: boolean;
  publicBaseUrl: string;
  uploadTtlSeconds: number;
};

export function createS3MediaStorage(config: S3Config, fetcher: typeof fetch = fetch): MediaStorage {
  const location = (key: string): S3Location => {
    assertMediaKey(key);
    return {
      endpoint: config.endpoint,
      bucket: isPrivateKey(key) ? config.privateBucket : config.publicBucket,
      key,
      region: config.region,
      pathStyle: config.pathStyle,
    };
  };
  const credentials = { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey };
  const sign = (method: string, key: string, expiresInSeconds: number) =>
    presignS3({ method, location: location(key), credentials, expiresInSeconds });

  return {
    provider: "s3",
    publicUrl: (key) => {
      if (isPrivateKey(key)) throw new PrivateMediaKeyError(key);
      assertMediaKey(key);
      return `${config.publicBaseUrl}/${key}`;
    },
    signedDeliveryUrl: (key, expiresInSeconds) => sign("GET", key, expiresInSeconds),
    localPath: () => null,
    async createUpload({ key, mimeType }) {
      return {
        url: sign("PUT", key, config.uploadTtlSeconds),
        method: "PUT",
        headers: { "content-type": mimeType },
        expiresAt: new Date(Date.now() + config.uploadTtlSeconds * 1000),
      };
    },
    async verifyUpload(key) {
      const response = await fetcher(sign("HEAD", key, 60), { method: "HEAD" });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Storage answered ${response.status} for HEAD ${key}`);
      return {
        key,
        byteSize: Number(response.headers.get("content-length") ?? 0),
        mimeType: response.headers.get("content-type") ?? undefined,
      };
    },
    async deleteObject(key) {
      const response = await fetcher(sign("DELETE", key, 60), { method: "DELETE" });
      if (!response.ok && response.status !== 404) throw new Error(`Storage answered ${response.status} for DELETE ${key}`);
    },
  };
}

export function createMediaStorageFromEnv(env: ServerEnv): MediaStorage {
  if (env.MEDIA_STORAGE_PROVIDER === "s3") {
    return createS3MediaStorage({
      endpoint: env.S3_ENDPOINT!,
      region: env.S3_REGION,
      publicBucket: env.S3_PUBLIC_BUCKET!,
      privateBucket: env.S3_PRIVATE_BUCKET!,
      accessKeyId: env.S3_ACCESS_KEY_ID!,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      pathStyle: env.S3_FORCE_PATH_STYLE === "true",
      publicBaseUrl: env.MEDIA_PUBLIC_BASE_URL,
      uploadTtlSeconds: env.MEDIA_SIGNED_URL_TTL_SECONDS,
    });
  }
  // The local adapter reads files at run time from where they already sit; it
  // is never used in production (MEDIA_STORAGE_PROVIDER=s3). Without the
  // ignore comments, Turbopack traces the media, or with the unscoped private
  // root the whole project, into every server function.
  return createLocalMediaStorage(env.MEDIA_PUBLIC_BASE_URL, {
    public: join(/*turbopackIgnore: true*/ process.cwd(), "public", "media"),
    private: resolve(/*turbopackIgnore: true*/ process.cwd(), env.MEDIA_PRIVATE_ROOT),
  });
}

let storage: MediaStorage | undefined;

// Tests exercise the upload flow against a fake provider.
export function setMediaStorageForTesting(adapter: MediaStorage | undefined) {
  storage = adapter;
}

export function getMediaStorage(): MediaStorage {
  storage ??= createMediaStorageFromEnv(serverEnv());
  return storage;
}
