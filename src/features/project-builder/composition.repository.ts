import { and, asc, eq, gt, gte, inArray, isNull, sql, type SQL } from "drizzle-orm";
import type { Database } from "@db/client";
import {
  blockMedia,
  media,
  pages,
  projectBlocks,
  projects,
  type BlockMedia as BlockMediaRow,
  type Media as MediaRow,
  type NewBlockMedia,
  type NewProjectBlock,
  type ProjectBlock as BlockRow,
} from "@db/schema";

// The working copy of a composition: every block, hidden or not, with its
// placements. Ordering follows CLAUDE.md §7: `position` is contiguous from 0
// within a container, and a container is an owner's root or a parent GRID.

export type { BlockMediaRow, BlockRow, MediaRow };

export type Owner = { kind: "project"; id: string } | { kind: "page"; id: string };

// null parent: the owner's root.
export type Container = { owner: Owner; parentBlockId: string | null };

const ownerColumn = (owner: Owner) => (owner.kind === "project" ? projectBlocks.projectId : projectBlocks.pageId);

function inContainer(container: Container): SQL {
  return container.parentBlockId
    ? eq(projectBlocks.parentBlockId, container.parentBlockId)
    : and(eq(ownerColumn(container.owner), container.owner.id), isNull(projectBlocks.parentBlockId))!;
}

export function createCompositionRepository(db: Database) {
  return {
    // Serialises every composition change of one owner for the rest of the
    // transaction, so concurrent inserts, moves and deletes cannot interleave
    // their position shifts (CLAUDE.md §15). Also proves the owner is live.
    async lockOwner(owner: Owner): Promise<boolean> {
      const rows =
        owner.kind === "project"
          ? await db
              .select({ id: projects.id })
              .from(projects)
              .where(and(eq(projects.id, owner.id), isNull(projects.deletedAt)))
              .for("update")
          : await db.select({ id: pages.id }).from(pages).where(eq(pages.id, owner.id)).for("update");
      return rows.length > 0;
    },

    async findBlock(id: string): Promise<BlockRow | null> {
      const [row] = await db.select().from(projectBlocks).where(eq(projectBlocks.id, id));
      return row ?? null;
    },

    // Roots and children of an owner, in container order.
    async listBlocks(owner: Owner): Promise<BlockRow[]> {
      const roots = await db
        .select()
        .from(projectBlocks)
        .where(and(eq(ownerColumn(owner), owner.id), isNull(projectBlocks.parentBlockId)))
        .orderBy(asc(projectBlocks.position), asc(projectBlocks.id));
      if (!roots.length) return [];
      const children = await db
        .select()
        .from(projectBlocks)
        .where(inArray(projectBlocks.parentBlockId, roots.map((b) => b.id)))
        .orderBy(asc(projectBlocks.position), asc(projectBlocks.id));
      return [...roots, ...children];
    },

    async listChildren(parentBlockId: string): Promise<BlockRow[]> {
      return db
        .select()
        .from(projectBlocks)
        .where(eq(projectBlocks.parentBlockId, parentBlockId))
        .orderBy(asc(projectBlocks.position), asc(projectBlocks.id));
    },

    async listContainer(container: Container): Promise<BlockRow[]> {
      return db
        .select()
        .from(projectBlocks)
        .where(inContainer(container))
        .orderBy(asc(projectBlocks.position), asc(projectBlocks.id));
    },

    async countContainer(container: Container): Promise<number> {
      const [{ n }] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(projectBlocks)
        .where(inContainer(container));
      return n;
    },

    // Every block at or after `from` moves one place right.
    async shiftRight(container: Container, from: number) {
      await db
        .update(projectBlocks)
        .set({ position: sql`${projectBlocks.position} + 1` })
        .where(and(inContainer(container), gte(projectBlocks.position, from)));
    },

    // Closes the gap a removed block leaves at `at`.
    async closeGap(container: Container, at: number) {
      await db
        .update(projectBlocks)
        .set({ position: sql`${projectBlocks.position} - 1` })
        .where(and(inContainer(container), gt(projectBlocks.position, at)));
    },

    async insertBlock(values: NewProjectBlock): Promise<BlockRow> {
      const [row] = await db.insert(projectBlocks).values(values).returning();
      return row;
    },

    async updateBlock(id: string, patch: Partial<Pick<BlockRow, "content" | "config" | "isHidden">>): Promise<BlockRow> {
      const [row] = await db
        .update(projectBlocks)
        .set({ ...patch, updatedAt: sql`now()` })
        .where(eq(projectBlocks.id, id))
        .returning();
      return row;
    },

    // Re-homes a block: its container, its position and its config together.
    async placeBlock(
      id: string,
      values: Pick<BlockRow, "parentBlockId" | "projectId" | "pageId" | "position" | "config">,
    ): Promise<BlockRow> {
      const [row] = await db
        .update(projectBlocks)
        .set({ ...values, updatedAt: sql`now()` })
        .where(eq(projectBlocks.id, id))
        .returning();
      return row;
    },

    // Cascades to children and to every placement; never to media assets.
    async deleteBlock(id: string) {
      await db.delete(projectBlocks).where(eq(projectBlocks.id, id));
    },

    async setBlockPositions(ids: readonly string[]) {
      for (const [position, id] of ids.entries()) {
        await db.update(projectBlocks).set({ position, updatedAt: sql`now()` }).where(eq(projectBlocks.id, id));
      }
    },

    // ---- Placements ----

    async listPlacements(blockIds: readonly string[]): Promise<BlockMediaRow[]> {
      if (!blockIds.length) return [];
      return db
        .select()
        .from(blockMedia)
        .where(inArray(blockMedia.blockId, [...blockIds]))
        .orderBy(asc(blockMedia.blockId), asc(blockMedia.position), asc(blockMedia.id));
    },

    async findPlacement(blockId: string, id: string): Promise<BlockMediaRow | null> {
      const [row] = await db
        .select()
        .from(blockMedia)
        .where(and(eq(blockMedia.id, id), eq(blockMedia.blockId, blockId)));
      return row ?? null;
    },

    async lockBlock(id: string): Promise<BlockRow | null> {
      const [row] = await db.select().from(projectBlocks).where(eq(projectBlocks.id, id)).for("update");
      return row ?? null;
    },

    async shiftPlacementsRight(blockId: string, from: number) {
      await db
        .update(blockMedia)
        .set({ position: sql`${blockMedia.position} + 1` })
        .where(and(eq(blockMedia.blockId, blockId), gte(blockMedia.position, from)));
    },

    async closePlacementGap(blockId: string, at: number) {
      await db
        .update(blockMedia)
        .set({ position: sql`${blockMedia.position} - 1` })
        .where(and(eq(blockMedia.blockId, blockId), gt(blockMedia.position, at)));
    },

    async insertPlacement(values: NewBlockMedia): Promise<BlockMediaRow> {
      const [row] = await db.insert(blockMedia).values(values).returning();
      return row;
    },

    async insertPlacements(values: NewBlockMedia[]) {
      if (values.length) await db.insert(blockMedia).values(values);
    },

    async updatePlacement(
      id: string,
      patch: Partial<Pick<BlockMediaRow, "altText" | "posterMediaId" | "config">>,
    ): Promise<BlockMediaRow> {
      const [row] = await db.update(blockMedia).set(patch).where(eq(blockMedia.id, id)).returning();
      return row;
    },

    async deletePlacement(id: string) {
      await db.delete(blockMedia).where(eq(blockMedia.id, id));
    },

    async setPlacementPositions(ids: readonly string[]) {
      for (const [position, id] of ids.entries()) {
        await db.update(blockMedia).set({ position }).where(eq(blockMedia.id, id));
      }
    },

    // Media rows for DTOs, soft-deleted or not: a placement always shows what
    // it references.
    async findMediaRows(ids: readonly string[]): Promise<MediaRow[]> {
      if (!ids.length) return [];
      return db
        .select()
        .from(media)
        .where(inArray(media.id, [...new Set(ids)]));
    },
  };
}

export type CompositionRepository = ReturnType<typeof createCompositionRepository>;
