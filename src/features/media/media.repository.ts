import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Database } from "@db/client";
import { blockMedia, media, pages, projectBlocks, projects } from "@db/schema";

export type MediaRecord = {
  id: string;
  type: "IMAGE" | "VIDEO" | "EXTERNAL_VIDEO";
  status: "UPLOADING" | "PROCESSING" | "READY" | "FAILED";
  storageProvider: string | null;
  storageKey: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  altText: string | null;
  posterMediaId: string | null;
};

// Every relational reference that keeps an asset in use (CLAUDE.md §12):
// project covers and previews (ADR-0011), block placements, placement posters
// (ADR-0015) and asset default posters (ADR-0009). References held by a
// soft-deleted project or asset no longer count: V1 has no restore.
export type MediaUsage =
  | { kind: "PROJECT_COVER" | "PROJECT_PREVIEW"; projectId: string; projectTitle: string }
  | {
      kind: "BLOCK_MEDIA" | "PLACEMENT_POSTER";
      blockId: string;
      projectId: string | null;
      projectTitle: string | null;
      pageKey: string | null;
    }
  | { kind: "ASSET_POSTER"; mediaId: string };

const columns = {
  id: media.id,
  type: media.type,
  status: media.status,
  storageProvider: media.storageProvider,
  storageKey: media.storageKey,
  mimeType: media.mimeType,
  width: media.width,
  height: media.height,
  durationMs: media.durationMs,
  altText: media.altText,
  posterMediaId: media.posterMediaId,
};

export function createMediaRepository(db: Database) {
  return {
    // Assets that are not soft-deleted, by id.
    async findLiveByIds(ids: readonly string[]): Promise<MediaRecord[]> {
      if (!ids.length) return [];
      return db
        .select(columns)
        .from(media)
        .where(and(inArray(media.id, [...ids]), isNull(media.deletedAt)));
    },

    async findUsages(mediaId: string): Promise<MediaUsage[]> {
      // A GRID child names only its parent (ADR-0007), so a placement's owner
      // is its block's owner or its parent's.
      const parent = alias(projectBlocks, "parent_block");
      const ownerProjectId = sql`coalesce(${projectBlocks.projectId}, ${parent.projectId})`;
      const ownerPageId = sql`coalesce(${projectBlocks.pageId}, ${parent.pageId})`;

      const [covers, previews, placements, posters] = await Promise.all([
        db
          .select({ projectId: projects.id, projectTitle: projects.title })
          .from(projects)
          .where(and(eq(projects.coverMediaId, mediaId), isNull(projects.deletedAt))),
        db
          .select({ projectId: projects.id, projectTitle: projects.title })
          .from(projects)
          .where(and(eq(projects.previewMediaId, mediaId), isNull(projects.deletedAt))),
        db
          .select({
            blockId: blockMedia.blockId,
            mediaId: blockMedia.mediaId,
            posterMediaId: blockMedia.posterMediaId,
            projectId: projects.id,
            projectTitle: projects.title,
            pageKey: pages.key,
          })
          .from(blockMedia)
          .innerJoin(projectBlocks, eq(projectBlocks.id, blockMedia.blockId))
          .leftJoin(parent, eq(parent.id, projectBlocks.parentBlockId))
          .leftJoin(projects, sql`${projects.id} = ${ownerProjectId}`)
          .leftJoin(pages, sql`${pages.id} = ${ownerPageId}`)
          .where(
            and(
              or(eq(blockMedia.mediaId, mediaId), eq(blockMedia.posterMediaId, mediaId)),
              isNull(projects.deletedAt),
            ),
          ),
        db
          .select({ mediaId: media.id })
          .from(media)
          .where(and(eq(media.posterMediaId, mediaId), isNull(media.deletedAt))),
      ]);

      return [
        ...covers.map((row) => ({ kind: "PROJECT_COVER" as const, ...row })),
        ...previews.map((row) => ({ kind: "PROJECT_PREVIEW" as const, ...row })),
        ...placements.flatMap(({ mediaId: placed, posterMediaId, ...owner }) => [
          ...(placed === mediaId ? [{ kind: "BLOCK_MEDIA" as const, ...owner }] : []),
          ...(posterMediaId === mediaId ? [{ kind: "PLACEMENT_POSTER" as const, ...owner }] : []),
        ]),
        ...posters.map((row) => ({ kind: "ASSET_POSTER" as const, ...row })),
      ];
    },
  };
}
