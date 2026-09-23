import { eq } from "drizzle-orm";
import type { Database } from "@db/client";
import { pages, type Page as PageRow } from "@db/schema";
import { notFound } from "@/lib/errors/domain-error";
import type { PublicationDto } from "@/features/projects/project.mapper";
import { createCompositionService } from "./composition.service";

// Singleton pages that own a composition (ADR-0007). HOME is the only one.

export const PAGE_KEYS = ["HOME"] as const;
export type PageKey = (typeof PAGE_KEYS)[number];

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

export function createPageService(db: Database, summarize: PagePublicationSummarizer = noSnapshot) {
  return {
    async owner(key: PageKey) {
      const page = await findPage(db, key);
      return { kind: "page" as const, id: page.id };
    },

    async get(key: PageKey) {
      const page = await findPage(db, key);
      const [blocks, publication] = await Promise.all([
        createCompositionService(db).tree({ kind: "page", id: page.id }),
        summarize(db, page),
      ]);
      return {
        id: page.id,
        key: page.key,
        title: page.title,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
        blocks,
        publication,
      };
    },
  };
}
