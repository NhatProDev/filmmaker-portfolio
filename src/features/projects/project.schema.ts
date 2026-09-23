import { z } from "zod";

// projects.credits is JSONB; this is its contract.
export const projectCreditsSchema = z
  .array(z.strictObject({ role: z.string().trim().min(1).max(120), name: z.string().trim().min(1).max(200) }))
  .max(100);

export type ProjectCredits = z.infer<typeof projectCreditsSchema>;

// ---- Requests (openapi.yaml, CLAUDE.md §14) ----

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase letters, digits and single hyphens only");

// Optional text: a blank string clears the field.
const optionalText = (max: number) =>
  z.preprocess((value) => (typeof value === "string" && value.trim() === "" ? null : value), z.string().trim().max(max).nullable());

export const projectPasswordSchema = z.string().min(8, "must be at least 8 characters").max(200);

const metadata = {
  title: z.string().trim().min(1).max(200),
  slug: slugSchema,
  shortDescription: optionalText(500).optional(),
  description: optionalText(20000).optional(),
  year: z.int().min(1900).max(2100).nullable().optional(),
  category: optionalText(120).optional(),
  client: optionalText(200).optional(),
  role: optionalText(200).optional(),
  runtime: optionalText(100).optional(),
  credits: projectCreditsSchema.optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
  coverMediaId: z.uuid().nullable().optional(),
  previewMediaId: z.uuid().nullable().optional(),
};

export const createProjectSchema = z
  .strictObject({ ...metadata, password: projectPasswordSchema.optional() })
  .superRefine((value, ctx) => {
    if (value.visibility === "PRIVATE" && !value.password) {
      ctx.addIssue({ code: "custom", path: ["password"], message: "is required for a PRIVATE project" });
    }
  });

// displayPosition and featuredPosition are written only by the ordering
// endpoints (ADR-0002); as unknown keys they are rejected here.
export const updateProjectSchema = z
  .strictObject({
    ...metadata,
    title: metadata.title.optional(),
    slug: metadata.slug.optional(),
    isFeatured: z.boolean().optional(),
    seoTitle: optionalText(200).optional(),
    seoDescription: optionalText(500).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "at least one field is required");

export const listProjectsQuerySchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
  search: z.string().trim().max(200).optional(),
});

const idSet = z
  .array(z.uuid())
  .refine((ids) => new Set(ids).size === ids.length, "ids must be unique");

export const reorderProjectsSchema = z.strictObject({ projectIds: idSet.min(1) });
export const reorderFeaturedSchema = z.strictObject({ projectIds: idSet.min(1) });
export const setPasswordSchema = z.strictObject({ password: projectPasswordSchema });
