import { transaction, type Database } from "@db/client";
import type { Page as PageRow } from "@db/schema";
import {
  pageSnapshotSchema,
  renderHome,
  renderIssues,
  type PageSnapshot,
} from "@/features/site-content/snapshot-projection";
import type { PublicationDto } from "@/features/projects/project.mapper";
import { invalid } from "@/lib/errors/domain-error";
import { findPage, type PageKey } from "./page.service";
import { createPublicationRepository } from "./publication.repository";
import { readComposition, stableJson } from "./snapshot";

// Publishing a page (ADR-0007, ADR-0012). Home is always live: it can be
// republished but not unpublished, and until its first publish the public
// site shows its committed default.

export async function buildPageSnapshot(db: Database, page: PageRow): Promise<PageSnapshot> {
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

export function pageSnapshotIssues(snapshot: unknown): string[] {
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
        issues: pageSnapshotIssues(candidate),
      };
    },

    async publish(key: PageKey, adminId: string | null) {
      await transaction(db, async (tx) => {
        const page = await findPage(tx, key);
        const snapshot = await buildPageSnapshot(tx, page);
        const issues = pageSnapshotIssues(snapshot);
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
