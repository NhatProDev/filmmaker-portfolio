import { z } from "zod";

// The structured content of the keyed pages that are not compositions
// (ADR-0017): About, Contact and the site settings. Every schema is strict —
// an unknown key, a colour, a typeface, a layout value or a media id is
// rejected, never ignored (CLAUDE.md §6, §13). Media are placed in closed,
// named slots through `page_media`, never in this content.

export const CONTENT_PAGE_KEYS = ["ABOUT", "CONTACT", "SITE"] as const;
export type ContentPageKey = (typeof CONTENT_PAGE_KEYS)[number];

// Text is stored exactly as written — an inline run's edge space is part of
// the sentence — and must not be blank.
const text = (max: number) =>
  z
    .string()
    .max(max)
    .refine((value) => value.trim().length > 0, "must not be empty");

// Plain text or emphasis: what the About page's experience rows render.
const emphasisRun = z.union([text(500), z.strictObject({ em: text(500) })]);

export const aboutContentSchema = z.strictObject({
  marker: text(100),
  lead: text(1000),
  portrait: z.strictObject({ caption: text(200) }),
  biography: z.array(text(3000)).min(1).max(6),
  evidence: z.strictObject({ caption: text(200), answer: text(2000) }),
  process: z.strictObject({ line: text(1000), caption: text(200) }),
  // The designed placeholder for an image that does not exist yet.
  placeholder: z.strictObject({ label: text(200), caption: text(200), line: text(1000) }),
  experience: z.strictObject({
    heading: text(200),
    rows: z
      .array(z.strictObject({ year: text(20), text: z.array(emphasisRun).min(1).max(20) }))
      .min(1)
      .max(30)
      .refine((rows) => new Set(rows.map((row) => row.year)).size === rows.length, "each year appears once"),
  }),
  availability: text(1000),
});
export type AboutPageContent = z.infer<typeof aboutContentSchema>;

// Contact rows may link to a site path, an https URL, a mailto address or a
// fragment (the approved prototype's placeholder links are "#").
const isContactHref = (value: string) =>
  /^\/(?!\/)\S*$/.test(value) || /^https:\/\/\S+$/.test(value) || /^mailto:[^\s@]+@[^\s@]+$/.test(value) || /^#[\w-]*$/.test(value);

export const contactContentSchema = z.strictObject({
  heading: text(100),
  statement: text(1000),
  email: z.strictObject({ label: text(50), reply: text(300) }),
  rows: z
    .array(
      z.strictObject({
        label: text(50),
        value: text(200),
        href: z.string().max(2000).refine(isContactHref, "must be a site path, an https URL, a mailto address or #").optional(),
      }),
    )
    .min(1)
    .max(8)
    .refine((rows) => new Set(rows.map((row) => row.label)).size === rows.length, "each label appears once"),
  note: text(1000),
  // The identity still is optional; with it, the `identity` slot is required.
  identity: z.strictObject({ caption: text(300) }).nullable(),
});
export type ContactPageContent = z.infer<typeof contactContentSchema>;

// Only what more than one page shows (ADR-0017 §4).
export const siteContentSchema = z.strictObject({
  name: text(120),
  role: text(200),
  email: z.email().max(320),
  footerNote: text(300),
  copyright: text(100),
});
export type SitePageContent = z.infer<typeof siteContentSchema>;

export const PAGE_CONTENT_SCHEMAS = {
  ABOUT: aboutContentSchema,
  CONTACT: contactContentSchema,
  SITE: siteContentSchema,
} as const;

export type PageContentOf<K extends ContentPageKey> = z.infer<(typeof PAGE_CONTENT_SCHEMAS)[K]>;

// The closed slot set per page: which images each page places.
export const PAGE_SLOTS: Record<ContentPageKey, readonly string[]> = {
  ABOUT: ["portrait", "evidence", "process"],
  CONTACT: ["identity"],
  SITE: [],
};

// The slots a page needs before it can be published, given its content.
export function requiredSlots(key: ContentPageKey, content: unknown): string[] {
  if (key === "ABOUT") return [...PAGE_SLOTS.ABOUT];
  if (key === "CONTACT") return (content as ContactPageContent | undefined)?.identity ? ["identity"] : [];
  return [];
}

export const updatePageContentSchema = z.strictObject({ content: z.unknown() });

export const setPageSlotSchema = z.strictObject({
  mediaId: z.uuid(),
  // NULL inherits the asset's default alt text; '' marks the use decorative.
  altText: z.string().max(1000).nullable().optional(),
});
