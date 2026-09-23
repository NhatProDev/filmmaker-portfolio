import { z } from "zod";

// Request schemas for the Media Library (openapi.yaml, CLAUDE.md §14).

export const MEDIA_TYPES = ["IMAGE", "VIDEO", "EXTERNAL_VIDEO"] as const;
export const MEDIA_STATUSES = ["UPLOADING", "PROCESSING", "READY", "FAILED"] as const;

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;

export const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 5 * 1024 * 1024 * 1024;

const altText = z.string().max(1000).nullable();

export const createUploadSchema = z.strictObject({
  filename: z.string().trim().min(1).max(255),
  mimeType: z.enum([...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES]),
  fileSizeBytes: z.int().min(1),
  checksumSha256: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  altText: altText.optional(),
});

// Provider URLs are accepted only on the provider's own https hosts.
const EXTERNAL_HOSTS = {
  vimeo: ["vimeo.com", "www.vimeo.com", "player.vimeo.com"],
  youtube: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"],
} as const;

export const createExternalSchema = z
  .strictObject({
    provider: z.enum(["vimeo", "youtube"]),
    url: z.url({ protocol: /^https$/ }).max(2000),
    altText: altText.optional(),
  })
  .refine(
    ({ provider, url }) => (EXTERNAL_HOSTS[provider] as readonly string[]).includes(new URL(url).hostname),
    { path: ["url"], message: "must be an https URL on the provider's own host" },
  );

export const updateMediaSchema = z
  .strictObject({
    altText: altText.optional(),
    posterMediaId: z.uuid().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "at least one field is required");

export const listMediaQuerySchema = z.object({
  type: z.enum(MEDIA_TYPES).optional(),
  status: z.enum(MEDIA_STATUSES).optional(),
  search: z.string().trim().max(200).optional(),
});
