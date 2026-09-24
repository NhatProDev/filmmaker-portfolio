import { z } from "zod";
import { slugSchema } from "@/features/projects/project.schema";

// Request schemas for albums (ADR-0019, openapi.yaml). Strict: an unknown
// field is refused, never ignored.

const text = (max: number) =>
  z
    .string()
    .max(max)
    .refine((value) => value.trim().length > 0, "must not be empty");

const optionalText = (max: number) => z.string().max(max).nullable().optional();

export const createAlbumSchema = z.strictObject({
  title: text(200),
  slug: slugSchema,
  description: optionalText(5000),
  collection: optionalText(120),
  projectId: z.uuid().nullable().optional(),
});

export const updateAlbumSchema = z
  .strictObject({
    title: text(200).optional(),
    slug: slugSchema.optional(),
    description: optionalText(5000),
    collection: optionalText(120),
    projectId: z.uuid().nullable().optional(),
    coverMediaId: z.uuid().nullable().optional(),
    seoTitle: optionalText(200),
    seoDescription: optionalText(500),
  })
  .refine((value) => Object.keys(value).length > 0, "at least one field is required");
export type UpdateAlbum = z.infer<typeof updateAlbumSchema>;

export const addAlbumMediaSchema = z.strictObject({
  mediaId: z.uuid(),
  // ADR-0005: omitted appends; 0..N inserts and shifts right; > N is 422.
  position: z.int().min(0).optional(),
  // NULL inherits the asset's default; '' marks it decorative (ADR-0011).
  altText: z.string().max(1000).nullable().optional(),
  caption: z.string().max(500).nullable().optional(),
});

export const updateAlbumMediaSchema = z
  .strictObject({
    altText: z.string().max(1000).nullable().optional(),
    caption: z.string().max(500).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "at least one field is required");

const idSet = z
  .array(z.uuid())
  .refine((ids) => new Set(ids).size === ids.length, "ids must be unique");

export const reorderAlbumMediaSchema = z.strictObject({ albumMediaIds: idSet });
export const reorderAlbumsSchema = z.strictObject({ albumIds: idSet });

export const listAlbumsQuerySchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});
