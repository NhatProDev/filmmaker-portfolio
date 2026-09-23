import { and, asc, eq, inArray, isNull, type SQL } from "drizzle-orm";
import type { Database } from "@db/client";
import { blockMedia, pages, projectBlocks } from "@db/schema";

export type BlockMediaRecord = {
  id: string;
  mediaId: string;
  position: number;
  // NULL inherits the asset's default; '' marks a decorative use (ADR-0011).
  altText: string | null;
  // NULL inherits the video asset's default poster (ADR-0015).
  posterMediaId: string | null;
  config: unknown;
};

export type BlockRecord = {
  id: string;
  type: "HERO" | "TEXT" | "IMAGE" | "VIDEO" | "GRID" | "GALLERY" | "SPACER";
  position: number;
  // JSONB, validated by the block schemas before use.
  content: unknown;
  config: unknown;
  media: BlockMediaRecord[];
  children: BlockRecord[];
};

const blockColumns = {
  id: projectBlocks.id,
  parentBlockId: projectBlocks.parentBlockId,
  type: projectBlocks.type,
  position: projectBlocks.position,
  content: projectBlocks.content,
  config: projectBlocks.config,
};

export function createBlockRepository(db: Database) {
  // A container's visible composition: its root blocks in order, each GRID's
  // children in order, and every block's media placements in order. Hidden
  // blocks are excluded at every level, and so are the children of a hidden
  // GRID (ADR-0006).
  async function visibleTree(owner: SQL): Promise<BlockRecord[]> {
    const roots = await db
      .select(blockColumns)
      .from(projectBlocks)
      .where(and(owner, isNull(projectBlocks.parentBlockId), eq(projectBlocks.isHidden, false)))
      .orderBy(asc(projectBlocks.position), asc(projectBlocks.id));
    if (!roots.length) return [];

    const children = await db
      .select(blockColumns)
      .from(projectBlocks)
      .where(and(inArray(projectBlocks.parentBlockId, roots.map((b) => b.id)), eq(projectBlocks.isHidden, false)))
      .orderBy(asc(projectBlocks.parentBlockId), asc(projectBlocks.position), asc(projectBlocks.id));

    const items = await db
      .select({
        id: blockMedia.id,
        blockId: blockMedia.blockId,
        mediaId: blockMedia.mediaId,
        position: blockMedia.position,
        altText: blockMedia.altText,
        posterMediaId: blockMedia.posterMediaId,
        config: blockMedia.config,
      })
      .from(blockMedia)
      .where(inArray(blockMedia.blockId, [...roots, ...children].map((b) => b.id)))
      .orderBy(asc(blockMedia.blockId), asc(blockMedia.position), asc(blockMedia.id));

    const mediaByBlock = new Map<string, BlockMediaRecord[]>();
    for (const { blockId, ...item } of items) {
      const list = mediaByBlock.get(blockId) ?? [];
      list.push(item);
      mediaByBlock.set(blockId, list);
    }
    const toRecord = (block: (typeof roots)[number]): BlockRecord => ({
      id: block.id,
      type: block.type,
      position: block.position,
      content: block.content,
      config: block.config,
      media: mediaByBlock.get(block.id) ?? [],
      children: [],
    });
    const records = roots.map(toRecord);
    const byId = new Map(records.map((record) => [record.id, record]));
    for (const child of children) byId.get(child.parentBlockId!)?.children.push(toRecord(child));
    return records;
  }

  return {
    listVisibleTreeForProject: (projectId: string) => visibleTree(eq(projectBlocks.projectId, projectId)),
    listVisibleTreeForPage: (pageId: string) => visibleTree(eq(projectBlocks.pageId, pageId)),

    async findPageByKey(key: string): Promise<{ id: string; key: string } | null> {
      const [page] = await db.select({ id: pages.id, key: pages.key }).from(pages).where(eq(pages.key, key));
      return page ?? null;
    },
  };
}
