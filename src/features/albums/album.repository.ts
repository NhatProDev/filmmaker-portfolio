import { and, asc, eq, gt, gte, isNull, sql } from "drizzle-orm";
import type { Database } from "@db/client";
import { albumMedia, albumPublications, albums, publicationMedia, type Album, type AlbumMedia, type NewAlbum } from "@db/schema";

// Album persistence (ADR-0019): the album rows, their ordered images and the
// one current published snapshot. No authorisation and no HTTP here.

export type AlbumRow = Album;
export type AlbumMediaRow = AlbumMedia;

const live = isNull(albums.deletedAt);

export function createAlbumRepository(db: Database) {
  return {
    // Serialises every change to the album order for the rest of the
    // transaction (CLAUDE.md §15), as projects do.
    async lockOrdering() {
      await db.execute(sql`select pg_advisory_xact_lock(hashtext('albums.ordering'))`);
    },

    async list(status?: AlbumRow["status"]): Promise<AlbumRow[]> {
      return db
        .select()
        .from(albums)
        .where(status ? and(live, eq(albums.status, status)) : live)
        .orderBy(asc(albums.displayPosition), asc(albums.id));
    },

    async findById(id: string, lock?: "update"): Promise<AlbumRow | null> {
      const query = db.select().from(albums).where(and(eq(albums.id, id), live));
      const [row] = lock ? await query.for(lock) : await query;
      return row ?? null;
    },

    // Slugs stay reserved after a soft delete, as projects' do.
    async slugTaken(slug: string, exceptId?: string): Promise<boolean> {
      const [row] = await db.select({ id: albums.id }).from(albums).where(eq(albums.slug, slug));
      return Boolean(row && row.id !== exceptId);
    },

    async count(): Promise<number> {
      const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(albums).where(live);
      return n;
    },

    async insert(values: NewAlbum): Promise<AlbumRow> {
      const [row] = await db.insert(albums).values(values).returning();
      return row;
    },

    async update(id: string, patch: Partial<NewAlbum>): Promise<AlbumRow> {
      const [row] = await db
        .update(albums)
        .set({ ...patch, updatedAt: sql`now()` })
        .where(eq(albums.id, id))
        .returning();
      return row;
    },

    async setPositions(ids: readonly string[]) {
      for (const [displayPosition, id] of ids.entries()) {
        await db.update(albums).set({ displayPosition }).where(eq(albums.id, id));
      }
    },

    // Closes the gap a removed album leaves in the display order.
    async compactOrder() {
      const rows = await db.select({ id: albums.id }).from(albums).where(live).orderBy(asc(albums.displayPosition), asc(albums.id));
      for (const [displayPosition, { id }] of rows.entries()) {
        await db.update(albums).set({ displayPosition }).where(eq(albums.id, id));
      }
    },

    // ---- Items ----

    async listItems(albumId: string): Promise<AlbumMediaRow[]> {
      return db.select().from(albumMedia).where(eq(albumMedia.albumId, albumId)).orderBy(asc(albumMedia.position), asc(albumMedia.id));
    },

    async findItem(albumId: string, id: string): Promise<AlbumMediaRow | null> {
      const [row] = await db
        .select()
        .from(albumMedia)
        .where(and(eq(albumMedia.id, id), eq(albumMedia.albumId, albumId)));
      return row ?? null;
    },

    async shiftItemsRight(albumId: string, from: number) {
      await db
        .update(albumMedia)
        .set({ position: sql`${albumMedia.position} + 1` })
        .where(and(eq(albumMedia.albumId, albumId), gte(albumMedia.position, from)));
    },

    async closeItemGap(albumId: string, at: number) {
      await db
        .update(albumMedia)
        .set({ position: sql`${albumMedia.position} - 1` })
        .where(and(eq(albumMedia.albumId, albumId), gt(albumMedia.position, at)));
    },

    async insertItem(values: typeof albumMedia.$inferInsert): Promise<AlbumMediaRow> {
      const [row] = await db.insert(albumMedia).values(values).returning();
      return row;
    },

    async updateItem(id: string, patch: Partial<Pick<AlbumMediaRow, "altText" | "caption">>): Promise<AlbumMediaRow> {
      const [row] = await db.update(albumMedia).set(patch).where(eq(albumMedia.id, id)).returning();
      return row;
    },

    async deleteItem(id: string) {
      await db.delete(albumMedia).where(eq(albumMedia.id, id));
    },

    async setItemPositions(ids: readonly string[]) {
      for (const [position, id] of ids.entries()) {
        await db.update(albumMedia).set({ position }).where(eq(albumMedia.id, id));
      }
    },

    // ---- Publication (ADR-0012) ----

    async findPublication(albumId: string): Promise<{ snapshot: unknown; publishedAt: Date } | null> {
      const [row] = await db
        .select({ snapshot: albumPublications.snapshot, publishedAt: albumPublications.publishedAt })
        .from(albumPublications)
        .where(eq(albumPublications.albumId, albumId));
      return row ?? null;
    },

    async savePublication(albumId: string, snapshot: unknown, mediaIds: readonly string[], adminId: string | null) {
      await db
        .insert(albumPublications)
        .values({ albumId, snapshot, publishedBy: adminId })
        .onConflictDoUpdate({
          target: albumPublications.albumId,
          set: { snapshot, publishedAt: new Date(), publishedBy: adminId },
        });
      await db.delete(publicationMedia).where(eq(publicationMedia.albumId, albumId));
      if (mediaIds.length) {
        await db.insert(publicationMedia).values([...new Set(mediaIds)].map((mediaId) => ({ albumId, mediaId })));
      }
    },

    // Cascades to the snapshot's media list.
    async deletePublication(albumId: string): Promise<boolean> {
      const deleted = await db
        .delete(albumPublications)
        .where(eq(albumPublications.albumId, albumId))
        .returning({ albumId: albumPublications.albumId });
      return deleted.length > 0;
    },

    // Every published, live album with its snapshot, in display order.
    async listPublished(): Promise<{ album: AlbumRow; snapshot: unknown }[]> {
      const rows = await db
        .select({ album: albums, snapshot: albumPublications.snapshot })
        .from(albums)
        .innerJoin(albumPublications, eq(albumPublications.albumId, albums.id))
        .where(and(live, eq(albums.status, "PUBLISHED")))
        .orderBy(asc(albums.displayPosition), asc(albums.id));
      return rows;
    },
  };
}

export type AlbumRepository = ReturnType<typeof createAlbumRepository>;
