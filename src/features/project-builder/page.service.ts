import { eq } from "drizzle-orm";
import type { Database } from "@db/client";
import { pages, type Page as PageRow } from "@db/schema";
import { contentPageDetail } from "@/features/page-content/page-content.service";
import { notFound } from "@/lib/errors/domain-error";
import type { PublicationDto } from "@/features/projects/project.mapper";
import { createCompositionService } from "./composition.service";

// Keyed singleton pages (ADR-0007, ADR-0017). HOME owns a block composition;
// ABOUT, CONTACT and SITE hold structured content and media slots.

export const PAGE_KEYS = ["HOME", "ABOUT", "CONTACT", "SITE"] as const;
export type PageKey = (typeof PAGE_KEYS)[number];

// The pages that own a block composition.
export const COMPOSED_PAGE_KEYS = ["HOME"] as const;
export type ComposedPageKey = (typeof COMPOSED_PAGE_KEYS)[number];

export const isComposedPage = (key: string): key is ComposedPageKey => (COMPOSED_PAGE_KEYS as readonly string[]).includes(key);

export type PagePublicationSummarizer = (db: Database, page: PageRow) => Promise<PublicationDto>;

const noSnapshot: PagePublicationSummarizer = async () => ({
  isPublished: false,
  publishedAt: null,
  hasUnpublishedChanges: false,
  issues: [],
});

export async function findPage(db: Database, key: PageKey): Promise<PageRow> {
  const [row] = await db.select().from(pages).where(eq(pages.key, key));
  if (!row) throw notFound("PAGE_NOT_FOUND", "Page not found.");
  return row;
}

const base = (page: PageRow) => ({
  id: page.id,
  key: page.key,
  title: page.title,
  seoTitle: page.seoTitle,
  seoDescription: page.seoDescription,
});

export function createPageService(db: Database, summarize: PagePublicationSummarizer = noSnapshot) {
  const service = {
    async owner(key: ComposedPageKey) {
      const page = await findPage(db, key);
      return { kind: "page" as const, id: page.id };
    },

    async getComposed(key: ComposedPageKey) {
      const page = await findPage(db, key);
      const [blocks, publication] = await Promise.all([
        createCompositionService(db).tree({ kind: "page", id: page.id }),
        summarize(db, page),
      ]);
      return { ...base(page), blocks, publication };
    },

    async getStructured(key: Exclude<PageKey, ComposedPageKey>) {
      const page = await findPage(db, key);
      const [detail, publication] = await Promise.all([contentPageDetail(db, page), summarize(db, page)]);
      return { ...base(page), ...detail, publication };
    },

    async get(key: PageKey) {
      return isComposedPage(key) ? service.getComposed(key) : service.getStructured(key);
    },
  };
  return service;
}
