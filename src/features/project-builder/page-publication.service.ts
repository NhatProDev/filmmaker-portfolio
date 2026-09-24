import { transaction, type Database } from "@db/client";
import type { Page as PageRow } from "@db/schema";
import { site as committedSite } from "@/content/site";
import type { ContentPageKey } from "@/features/page-content/page-content.schema";
import { buildContentPageSnapshot, type ContentPageSnapshot } from "@/features/page-content/page-content.snapshot";
import { contentPageIssues } from "@/features/site-content/page-content-projection";
import {
  pageSnapshotSchema,
  renderHome,
  renderIssues,
  type PageSnapshot,
} from "@/features/site-content/snapshot-projection";
import type { PublicationDto } from "@/features/projects/project.mapper";
import { invalid } from "@/lib/errors/domain-error";
import { findPage, isComposedPage, type PageKey } from "./page.service";
import { createPublicationRepository } from "./publication.repository";
import { readComposition, stableJson } from "./snapshot";

// Publishing a page (ADR-0007, ADR-0012, ADR-0017). Pages are always live:
// they can be republished but not unpublished, and until a page's first
// publish the public site shows its committed content.

export async function buildPageSnapshot(db: Database, page: PageRow): Promise<PageSnapshot | ContentPageSnapshot> {
  if (!isComposedPage(page.key)) return buildContentPageSnapshot(db, page);
  const composition = await readComposition(db, { kind: "page", id: page.id });
  return {
    version: 1,
    page: { id: page.id, key: page.key, title: page.title, seoTitle: page.seoTitle, seoDescription: page.seoDescription },
    blocks: composition.blocks,
    media: composition.media,
  };
}

// The footer is site chrome, not snapshot content; validation needs none.
const NO_FOOTER = { email: "", note: "", links: [] };

export function pageSnapshotIssues(snapshot: unknown, key: PageKey = "HOME"): string[] {
  // Site settings only fill in shared values; they cannot make a page invalid.
  if (!isComposedPage(key)) return contentPageIssues(snapshot, key as ContentPageKey, committedSite);
  const parsed = pageSnapshotSchema.safeParse(snapshot);
  if (!parsed.success) return parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  return renderIssues(() => renderHome(parsed.data, NO_FOOTER));
}

export function createPagePublicationService(db: Database, options: { onPublicChange?: () => void } = {}) {
  return {
    async summary(tx: Database, page: PageRow): Promise<PublicationDto> {
      const stored = await createPublicationRepository(tx).findPage(page.id);
      const candidate = await buildPageSnapshot(tx, page);
      return {
        isPublished: stored !== null,
        publishedAt: stored?.publishedAt.toISOString() ?? null,
        hasUnpublishedChanges: stored !== null && stableJson(candidate) !== stableJson(stored.snapshot),
        issues: pageSnapshotIssues(candidate, page.key as PageKey),
      };
    },

    async publish(key: PageKey, adminId: string | null) {
      await transaction(db, async (tx) => {
        const page = await findPage(tx, key);
        const snapshot = await buildPageSnapshot(tx, page);
        const issues = pageSnapshotIssues(snapshot, key);
        if (issues.length) {
          throw invalid("PAGE_NOT_PUBLISHABLE", "The page cannot be published yet.", {
            issues: issues.map((message) => ({ path: "", message })),
          });
        }
        await createPublicationRepository(tx).savePage(page.id, snapshot, snapshot.media.map((m) => m.id), adminId);
      });
      options.onPublicChange?.();
    },
  };
}
