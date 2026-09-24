import { and, count, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Database } from "@db/client";
import {
  blockMedia,
  media,
  pages,
  projectBlocks,
  projects,
  publicationMedia,
  type Media as MediaRow,
  type NewMedia,
} from "@db/schema";

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
// (ADR-0015), asset default posters (ADR-0009) and current published snapshots
// (ADR-0012). References held by a soft-deleted project or asset no longer
// count: V1 has no restore.
export type MediaUsage =
  | { kind: "PROJECT_COVER" | "PROJECT_PREVIEW"; projectId: string; projectTitle: string }
  | {
      kind: "BLOCK_MEDIA" | "PLACEMENT_POSTER";
      blockId: string;
      projectId: string | null;
      projectTitle: string | null;
      pageKey: string | null;
    }
  | { kind: "ASSET_POSTER"; mediaId: string }
  | { kind: "PUBLISHED_PROJECT"; projectId: string; projectTitle: string }
  | { kind: "PUBLISHED_PAGE"; pageKey: string };

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

const live = isNull(media.deletedAt);

export function createMediaRepository(db: Database) {
  return {
    // Assets that are not soft-deleted, by id.
    async findLiveByIds(ids: readonly string[]): Promise<MediaRecord[]> {
      if (!ids.length) return [];
      return db
        .select(columns)
        .from(media)
        .where(and(inArray(media.id, [...ids]), live));
    },

    async findRowsByIds(ids: readonly string[]): Promise<MediaRow[]> {
      if (!ids.length) return [];
      return db
        .select()
        .from(media)
        .where(and(inArray(media.id, [...new Set(ids)]), live));
    },

    // A live asset. `lock` takes a row lock for the rest of the transaction:
    // "update" before deleting, "share" before referencing it, so a delete
    // and a new reference cannot interleave.
    async findById(id: string, lock?: "update" | "share"): Promise<MediaRow | null> {
      const query = db.select().from(media).where(and(eq(media.id, id), live));
      const [row] = lock ? await query.for(lock) : await query;
      return row ?? null;
    },

    async list(filter: {
      type?: MediaRow["type"];
      status?: MediaRow["status"];
      search?: string;
      page: number;
      pageSize: number;
    }): Promise<{ rows: MediaRow[]; total: number }> {
      const conditions: SQL[] = [live];
      if (filter.type) conditions.push(eq(media.type, filter.type));
      if (filter.status) conditions.push(eq(media.status, filter.status));
      if (filter.search) {
        const pattern = `%${filter.search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
        conditions.push(
          or(
            ilike(media.filename, pattern),
            ilike(media.originalFilename, pattern),
            ilike(media.storageKey, pattern),
            ilike(media.altText, pattern),
          )!,
        );
      }
      const where = and(...conditions);
      const [rows, [{ total }]] = await Promise.all([
        db
          .select()
          .from(media)
          .where(where)
          .orderBy(desc(media.createdAt), desc(media.id))
          .limit(filter.pageSize)
          .offset((filter.page - 1) * filter.pageSize),
        db.select({ total: count() }).from(media).where(where),
      ]);
      return { rows, total };
    },

    async insert(values: NewMedia): Promise<MediaRow> {
      const [row] = await db.insert(media).values(values).returning();
      return row;
    },

    async update(id: string, patch: Partial<Pick<MediaRow, "altText" | "posterMediaId">>): Promise<MediaRow> {
      const [row] = await db
        .update(media)
        .set({ ...patch, updatedAt: sql`now()` })
        .where(eq(media.id, id))
        .returning();
      return row;
    },

    async findByChecksum(checksum: string): Promise<MediaRow | null> {
      const [row] = await db
        .select()
        .from(media)
        .where(and(eq(media.checksumSha256, checksum), live));
      return row ?? null;
    },

    // Images are usable at once; video waits for processing, which a
    // provider adapter reports later.
    async markUploaded(
      id: string,
      stored: { fileSizeBytes: number; checksumSha256: string | null; mimeType: string | null },
    ): Promise<MediaRow> {
      const [row] = await db
        .update(media)
        .set({
          ...stored,
          status: sql`case when ${media.type} = 'IMAGE' then 'READY'::media_status else 'PROCESSING'::media_status end`,
          updatedAt: sql`now()`,
        })
        .where(eq(media.id, id))
        .returning();
      return row;
    },

    async softDelete(id: string) {
      await db
        .update(media)
        .set({ deletedAt: sql`now()`, updatedAt: sql`now()` })
        .where(eq(media.id, id));
    },

    async findUsages(mediaId: string): Promise<MediaUsage[]> {
      // A GRID child names only its parent (ADR-0007), so a placement's owner
      // is its block's owner or its parent's.
      const parent = alias(projectBlocks, "parent_block");
      const ownerProjectId = sql`coalesce(${projectBlocks.projectId}, ${parent.projectId})`;
      const ownerPageId = sql`coalesce(${projectBlocks.pageId}, ${parent.pageId})`;

      const [covers, previews, placements, posters, snapshots] = await Promise.all([
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
          .where(and(eq(media.posterMediaId, mediaId), live)),
        db
          .select({ projectId: projects.id, projectTitle: projects.title, pageKey: pages.key })
          .from(publicationMedia)
          .leftJoin(projects, eq(projects.id, publicationMedia.projectId))
          .leftJoin(pages, eq(pages.id, publicationMedia.pageId))
          .where(eq(publicationMedia.mediaId, mediaId)),
      ]);

      return [
        ...covers.map((row) => ({ kind: "PROJECT_COVER" as const, ...row })),
        ...previews.map((row) => ({ kind: "PROJECT_PREVIEW" as const, ...row })),
        ...placements.flatMap(({ mediaId: placed, posterMediaId, ...owner }) => [
          ...(placed === mediaId ? [{ kind: "BLOCK_MEDIA" as const, ...owner }] : []),
          ...(posterMediaId === mediaId ? [{ kind: "PLACEMENT_POSTER" as const, ...owner }] : []),
        ]),
        ...posters.map((row) => ({ kind: "ASSET_POSTER" as const, ...row })),
        ...snapshots.map((row) =>
          row.projectId
            ? { kind: "PUBLISHED_PROJECT" as const, projectId: row.projectId, projectTitle: row.projectTitle! }
            : { kind: "PUBLISHED_PAGE" as const, pageKey: row.pageKey! },
        ),
      ];
    },
  };
}
