import { and, eq, sql } from "drizzle-orm";
import type { Database } from "@db/client";
import { pageMedia, pages, type Page as PageRow } from "@db/schema";
import { createMediaService } from "@/features/media/media.service";
import { createMediaRepository } from "@/features/media/media.repository";
import { invalid } from "@/lib/errors/domain-error";
import { PAGE_CONTENT_SCHEMAS, PAGE_SLOTS, type ContentPageKey } from "./page-content.schema";
import { readPageSlots } from "./page-content.snapshot";

// Editing a structured page's working copy (ADR-0017): its content, validated
// whole against the page's strict schema, and its media slots. Visitors see a
// change only after Publish (ADR-0012).

export async function contentPageDetail(db: Database, page: PageRow) {
  const slots = await readPageSlots(db, page.id);
  const media = await createMediaService(db).dtosByIds(slots.map((slot) => slot.mediaId));
  return {
    content: page.content,
    slots: slots.map((slot) => ({ slot: slot.slot, altText: slot.altText, media: media.get(slot.mediaId) ?? null })),
  };
}

export function createPageContentService(db: Database) {
  return {
    async updateContent(page: PageRow, input: unknown) {
      const key = page.key as ContentPageKey;
      const parsed = PAGE_CONTENT_SCHEMAS[key].safeParse(input);
      if (!parsed.success) {
        throw invalid("VALIDATION_ERROR", "The page content is not valid.", {
          issues: parsed.error.issues.map((issue) => ({ path: ["content", ...issue.path].join("."), message: issue.message })),
        });
      }
      await db.update(pages).set({ content: parsed.data, updatedAt: sql`now()` }).where(eq(pages.id, page.id));
    },

    // One image per slot: a live, READY IMAGE from the Media Library.
    async setSlot(page: PageRow, slot: string, input: { mediaId: string; altText?: string | null }) {
      const key = page.key as ContentPageKey;
      if (!PAGE_SLOTS[key].includes(slot)) {
        throw invalid("VALIDATION_ERROR", `${slot} is not an image slot of this page.`, {
          issues: [{ path: "slot", message: `must be one of: ${PAGE_SLOTS[key].join(", ") || "(none)"}` }],
        });
      }
      const [asset] = await createMediaRepository(db).findLiveByIds([input.mediaId]);
      if (!asset || asset.type !== "IMAGE" || asset.status !== "READY") {
        throw invalid("VALIDATION_ERROR", "Choose a ready image from the Media Library.", {
          issues: [{ path: "mediaId", message: "must be a live, READY IMAGE" }],
        });
      }
      await db
        .insert(pageMedia)
        .values({ pageId: page.id, slot, mediaId: input.mediaId, altText: input.altText ?? null })
        .onConflictDoUpdate({
          target: [pageMedia.pageId, pageMedia.slot],
          set: { mediaId: input.mediaId, altText: input.altText ?? null },
        });
    },

    async clearSlot(page: PageRow, slot: string) {
      await db.delete(pageMedia).where(and(eq(pageMedia.pageId, page.id), eq(pageMedia.slot, slot)));
    },
  };
}
