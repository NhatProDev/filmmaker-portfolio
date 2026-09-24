import { z } from "zod";
import { ACTIVE_PICTURES } from "@db/schema";
import { parseExternalVideo } from "./external-video";

// Request schemas for the Media Library (openapi.yaml, CLAUDE.md §14).

export const MEDIA_TYPES = ["IMAGE", "VIDEO", "EXTERNAL_VIDEO"] as const;
export const MEDIA_STATUSES = ["UPLOADING", "PROCESSING", "READY", "FAILED"] as const;

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;

export const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 5 * 1024 * 1024 * 1024;

const altText = z.string().max(1000).nullable();

// Who may receive the original (ADR-0020): PUBLIC originals have a public
// URL; PRIVATE ones live under private/ and are delivered only through signed,
// access-checked routes.
export const MEDIA_AUDIENCES = ["PUBLIC", "PRIVATE"] as const;
export type MediaAudience = (typeof MEDIA_AUDIENCES)[number];

export const createUploadSchema = z.strictObject({
  filename: z.string().trim().min(1).max(255),
  audience: z.enum(MEDIA_AUDIENCES).optional(),
  mimeType: z.enum([...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES]),
  fileSizeBytes: z.int().min(1),
  checksumSha256: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  altText: altText.optional(),
});

// What the browser measured of the file it uploaded (ADR-0020): the server
// never decodes media, so dimensions, duration and — when the provider keeps
// no checksum — the SHA-256 are declared here, bounded, and required before a
// video can be READY.
export const completeUploadSchema = z
  .strictObject({
    checksumSha256: z.string().regex(/^[0-9a-f]{64}$/).optional(),
    width: z.int().min(1).max(20000).optional(),
    height: z.int().min(1).max(20000).optional(),
    durationMs: z.int().min(0).max(24 * 60 * 60 * 1000).optional(),
  })
  .refine((value) => (value.width === undefined) === (value.height === undefined), "width and height come together");
export type CompleteUpload = z.infer<typeof completeUploadSchema>;

export const createExternalSchema = z
  .strictObject({
    provider: z.enum(["vimeo", "youtube"]),
    url: z.url({ protocol: /^https$/ }).max(2000),
    altText: altText.optional(),
  })
  // Provider URLs are accepted only on the provider's own https hosts, and
  // only when they name a video its player can show (external-video.ts).
  .refine(({ provider, url }) => parseExternalVideo(provider, url) !== null, {
    path: ["url"],
    message: "must be a video address on the provider's own https host, such as youtube.com/watch?v=… or vimeo.com/123456",
  });

// ADR-0016: FULL (the file as encoded) or where a letterboxed picture sits.
export const ACTIVE_PICTURE_CHOICES = ["FULL", ...ACTIVE_PICTURES] as const;
export type ActivePictureChoice = (typeof ACTIVE_PICTURE_CHOICES)[number];

export const updateMediaSchema = z
  .strictObject({
    altText: altText.optional(),
    posterMediaId: z.uuid().nullable().optional(),
    activePicture: z.enum(ACTIVE_PICTURE_CHOICES).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "at least one field is required");

export const listMediaQuerySchema = z.object({
  type: z.enum(MEDIA_TYPES).optional(),
  status: z.enum(MEDIA_STATUSES).optional(),
  search: z.string().trim().max(200).optional(),
  audience: z.enum(MEDIA_AUDIENCES).optional(),
});
