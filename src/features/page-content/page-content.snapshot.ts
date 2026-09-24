import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "@db/client";
import { pageMedia, type Page as PageRow } from "@db/schema";
import { createMediaRepository, type MediaRecord } from "@/features/media/media.repository";
import { snapshotMediaSchema } from "@/features/project-builder/snapshot";
import { CONTENT_PAGE_KEYS, type ContentPageKey } from "./page-content.schema";

// A structured page as it is published (ADR-0012, ADR-0017): its content, its
// slots and the media records they name. Delivery URLs are derived when it is
// read (ADR-0014). The content is copied as stored; it is validated before it
// is written and again whenever it is read.

export const contentPageSnapshotSchema = z.strictObject({
  version: z.literal(1),
  page: z.strictObject({
    id: z.uuid(),
    key: z.enum(CONTENT_PAGE_KEYS),
    title: z.string(),
    seoTitle: z.string().nullable(),
    seoDescription: z.string().nullable(),
  }),
  content: z.unknown(),
  slots: z.array(z.strictObject({ slot: z.string(), mediaId: z.uuid(), altText: z.string().nullable() })),
  media: z.array(snapshotMediaSchema),
});

export type ContentPageSnapshot = {
  version: 1;
  page: { id: string; key: ContentPageKey; title: string; seoTitle: string | null; seoDescription: string | null };
  content: unknown;
  slots: { slot: string; mediaId: string; altText: string | null }[];
  media: MediaRecord[];
};

export async function readPageSlots(db: Database, pageId: string) {
  return db
    .select({ slot: pageMedia.slot, mediaId: pageMedia.mediaId, altText: pageMedia.altText })
    .from(pageMedia)
    .where(eq(pageMedia.pageId, pageId))
    .orderBy(asc(pageMedia.slot));
}

export async function buildContentPageSnapshot(db: Database, page: PageRow): Promise<ContentPageSnapshot> {
  const slots = await readPageSlots(db, page.id);
  const media = await createMediaRepository(db).findLiveByIds([...new Set(slots.map((slot) => slot.mediaId))]);
  return {
    version: 1,
    page: {
      id: page.id,
      key: page.key as ContentPageKey,
      title: page.title,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
    },
    content: page.content,
    slots,
    media: media.sort((a, b) => a.id.localeCompare(b.id)),
  };
}
