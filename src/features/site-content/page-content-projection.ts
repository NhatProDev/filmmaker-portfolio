import {
  aboutContentSchema,
  contactContentSchema,
  PAGE_SLOTS,
  requiredSlots,
  siteContentSchema,
  type ContentPageKey,
} from "@/features/page-content/page-content.schema";
import { contentPageSnapshotSchema, type ContentPageSnapshot } from "@/features/page-content/page-content.snapshot";
import type { z } from "zod";
import { ContentProjectionError, createMediaIndex, image, type MediaIndex } from "./db-projection";
import type { AboutContent, AboutImage, ContactContent, SiteSettings } from "./site-content.types";

// Structured pages (ADR-0017) projected onto the locked About and Contact
// view models, and the site settings their chrome reads. Every field lands on
// exactly one element the page already renders, so the pages stay as
// designed. Anything that does not validate is refused, never repaired.

function fail(where: string, message: string): never {
  throw new ContentProjectionError(`${where}: ${message}`);
}

export function parseContentPageSnapshot(value: unknown, key: ContentPageKey): ContentPageSnapshot {
  const where = `page ${key}`;
  const parsed = contentPageSnapshotSchema.safeParse(value);
  if (!parsed.success) fail(where, parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  if (parsed.data.page.key !== key) fail(where, `the snapshot belongs to ${parsed.data.page.key}`);
  return parsed.data as ContentPageSnapshot;
}

function content<T>(schema: z.ZodType<T>, snapshot: ContentPageSnapshot): T {
  const parsed = schema.safeParse(snapshot.content);
  if (!parsed.success) {
    fail(`page ${snapshot.page.key}`, parsed.error.issues.map((i) => `${i.path.join(".") || "content"}: ${i.message}`).join("; "));
  }
  return parsed.data;
}

// The slots are closed per key; a required one must hold a usable image.
function slotImage(snapshot: ContentPageSnapshot, index: MediaIndex, slot: string): AboutImage {
  const where = `page ${snapshot.page.key}, ${slot}`;
  const placed = snapshot.slots.find((item) => item.slot === slot);
  if (!placed) fail(where, "choose an image");
  const asset = index.get(placed.mediaId);
  const alt = placed.altText ?? asset?.altText ?? "";
  const { src, width, height } = image(index, placed.mediaId, alt, where);
  return { src, width, height, alt };
}

function checkSlots(snapshot: ContentPageSnapshot) {
  const allowed = PAGE_SLOTS[snapshot.page.key];
  for (const { slot } of snapshot.slots) {
    if (!allowed.includes(slot)) fail(`page ${snapshot.page.key}`, `${slot} is not a slot of this page`);
  }
}

export function renderSite(snapshot: ContentPageSnapshot): SiteSettings {
  return content(siteContentSchema, snapshot);
}

export function renderAbout(snapshot: ContentPageSnapshot, site: SiteSettings, url?: MediaIndex["url"]): AboutContent {
  checkSlots(snapshot);
  const about = content(aboutContentSchema, snapshot);
  const index = createMediaIndex(snapshot.media, url);
  return {
    marker: about.marker,
    lead: about.lead,
    portrait: { image: slotImage(snapshot, index, "portrait"), caption: about.portrait.caption },
    biography: about.biography,
    evidence: { image: slotImage(snapshot, index, "evidence"), caption: about.evidence.caption, answer: about.evidence.answer },
    process: { line: about.process.line, image: slotImage(snapshot, index, "process"), caption: about.process.caption },
    placeholder: about.placeholder,
    experience: about.experience,
    contact: { availability: about.availability, email: site.email },
  };
}

export function renderContact(snapshot: ContentPageSnapshot, site: SiteSettings, url?: MediaIndex["url"]): ContactContent {
  checkSlots(snapshot);
  const contact = content(contactContentSchema, snapshot);
  const index = createMediaIndex(snapshot.media, url);
  return {
    heading: contact.heading,
    statement: contact.statement,
    email: { label: contact.email.label, address: site.email, reply: contact.email.reply },
    rows: contact.rows,
    note: contact.note,
    identity: contact.identity ? { image: slotImage(snapshot, index, "identity"), caption: contact.identity.caption } : null,
    footer: { name: site.name, role: site.role, copyright: site.copyright },
  };
}

// Empty when the page can be published: its content validates, every slot
// it needs holds a usable image, and it renders on its locked template.
export function contentPageIssues(value: unknown, key: ContentPageKey, site: SiteSettings): string[] {
  try {
    const snapshot = parseContentPageSnapshot(value, key);
    const missing = requiredSlots(key, snapshot.content).filter((slot) => !snapshot.slots.some((item) => item.slot === slot));
    if (missing.length) return missing.map((slot) => `${slot}: choose an image`);
    if (key === "SITE") renderSite(snapshot);
    if (key === "ABOUT") renderAbout(snapshot, site);
    if (key === "CONTACT") renderContact(snapshot, site);
    return [];
  } catch (error) {
    if (error instanceof ContentProjectionError) return [error.message];
    throw error;
  }
}
