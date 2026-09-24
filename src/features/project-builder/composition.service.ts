import { transaction, type Database } from "@db/client";
import { assertPosterTarget } from "@/features/media/media.service";
import { createMediaRepository } from "@/features/media/media.repository";
import { conflict, invalid, notFound, validationError } from "@/lib/errors/domain-error";
import { blockMediaIssues, type PlacedMedia } from "./block-media.rules";
import {
  parseBlock,
  parseBlockMediaConfig,
  type BlockData,
  type BlockMediaConfig,
  type BlockType,
} from "./block.schema";
import { placementMediaIds, toBlockMediaDto, toBlockTree, type BlockDto } from "./composition.mapper";
import {
  createCompositionRepository,
  type BlockRow,
  type CompositionRepository,
  type Container,
  type Owner,
} from "./composition.repository";

// Composer operations on a working copy (CLAUDE.md §7, §13, §15; ADR-0005,
// ADR-0006, ADR-0007). Every change runs in one transaction that first locks
// the owner, so position shifts never interleave. Positions stay contiguous
// from 0 within each container.

export type { Owner };

const ownerNotFound = (owner: Owner) =>
  owner.kind === "project" ? notFound("PROJECT_NOT_FOUND", "Project not found.") : notFound("PAGE_NOT_FOUND", "Page not found.");

const blockNotFound = () => notFound("BLOCK_NOT_FOUND", "Block not found.");

const ownerFields = (owner: Owner) => (owner.kind === "project" ? { projectId: owner.id } : { pageId: owner.id });

function ownerOf(root: BlockRow): Owner {
  return root.projectId ? { kind: "project", id: root.projectId } : { kind: "page", id: root.pageId! };
}

function isOwnedRoot(block: BlockRow, owner: Owner) {
  return !block.parentBlockId && (owner.kind === "project" ? block.projectId === owner.id : block.pageId === owner.id);
}

function positionIssue(n: number) {
  return validationError([{ path: "position", message: `must be between 0 and ${n}; omit it to append` }]);
}

// Loads DTOs for the given block rows, with their placements and media.
async function blockDtos(repo: CompositionRepository, rows: BlockRow[]): Promise<BlockDto[]> {
  const placements = await repo.listPlacements(rows.map((row) => row.id));
  const assets = await repo.findMediaRows(placements.map((p) => p.mediaId));
  const media = await repo.findMediaRows(placementMediaIds(placements, assets));
  return toBlockTree(rows, placements, new Map(media.map((m) => [m.id, m])));
}

export function createCompositionService(db: Database) {
  // A block, its parent and its owner, with the owner locked.
  async function lockedBlock(tx: Database, blockId: string) {
    const repo = createCompositionRepository(tx);
    const found = await repo.findBlock(blockId);
    if (!found) throw blockNotFound();
    const parentId = found.parentBlockId;
    const parent = parentId ? await repo.findBlock(parentId) : null;
    const owner = ownerOf(parent ?? found);
    if (!(await repo.lockOwner(owner))) throw blockNotFound();
    // Re-read under the lock: positions may have moved meanwhile.
    const block = await repo.findBlock(blockId);
    if (!block) throw blockNotFound();
    const container: Container = { owner, parentBlockId: block.parentBlockId };
    // The stored block, validated only where a rule depends on it, so an
    // invalid legacy block can still be deleted.
    const parsed = () =>
      parseBlock(
        { type: block.type, content: block.content, config: block.config },
        { owner: owner.kind, parentType: parent?.type ?? null },
      );
    return { repo, block, parent, owner, container, parsed };
  }

  async function placedMedia(repo: CompositionRepository, blockId: string) {
    const placements = await repo.listPlacements([blockId]);
    const assets = new Map((await repo.findMediaRows(placements.map((p) => p.mediaId))).map((m) => [m.id, m]));
    return placements.map((placement) => ({
      placement,
      media: assets.get(placement.mediaId)!,
      config: placement.config as BlockMediaConfig,
    }));
  }

  function assertMediaFits(data: BlockData, items: PlacedMedia[]) {
    const issues = blockMediaIssues(data, items);
    if (issues.length) {
      throw invalid("INVALID_MEDIA_FOR_BLOCK", "The media does not fit this block.", {
        issues: issues.map((message) => ({ path: "media", message })),
      });
    }
  }

  async function singleBlockDto(repo: CompositionRepository, blockId: string): Promise<BlockDto> {
    const block = (await repo.findBlock(blockId))!;
    const [dto] = await blockDtos(repo, [block, ...(await repo.listChildren(blockId))]);
    return dto;
  }

  return {
    // The working copy: every root and child, hidden ones included.
    async tree(owner: Owner): Promise<BlockDto[]> {
      const repo = createCompositionRepository(db);
      return blockDtos(repo, await repo.listBlocks(owner));
    },

    async create(
      owner: Owner,
      input: {
        type: BlockType;
        content?: Record<string, unknown>;
        config?: Record<string, unknown>;
        parentBlockId?: string | null;
        position?: number;
        isHidden?: boolean;
        children?: { type: BlockType; content?: Record<string, unknown>; config?: Record<string, unknown>; isHidden?: boolean }[];
      },
    ): Promise<BlockDto> {
      return transaction(db, async (tx) => {
        const repo = createCompositionRepository(tx);
        if (!(await repo.lockOwner(owner))) throw ownerNotFound(owner);
        let parentType: BlockType | null = null;
        if (input.parentBlockId) {
          const parent = await repo.findBlock(input.parentBlockId);
          if (!parent || !isOwnedRoot(parent, owner)) {
            throw validationError([{ path: "parentBlockId", message: "must be a GRID of the same owner" }]);
          }
          parentType = parent.type;
        }
        const data = parseBlock(
          { type: input.type, content: input.content ?? {}, config: input.config ?? {} },
          { owner: owner.kind, parentType },
        );
        // Children are validated in their container before anything is
        // written; one level only (ADR-0006).
        const children = (input.children ?? []).map((child, i) => {
          if (data.type !== "GRID" || parentType !== null) {
            throw validationError([{ path: `children.${i}`, message: "only a top-level GRID is created with children" }]);
          }
          return {
            data: parseBlock({ type: child.type, content: child.content ?? {}, config: child.config ?? {} }, { owner: owner.kind, parentType: "GRID" }),
            isHidden: child.isHidden ?? false,
          };
        });
        const container: Container = { owner, parentBlockId: input.parentBlockId ?? null };
        const n = await repo.countContainer(container);
        const position = input.position ?? n;
        if (position > n) throw positionIssue(n);
        await repo.shiftRight(container, position);
        const row = await repo.insertBlock({
          ...(input.parentBlockId ? { parentBlockId: input.parentBlockId } : ownerFields(owner)),
          type: data.type,
          position,
          content: data.content,
          config: data.config,
          isHidden: input.isHidden ?? false,
        });
        for (const [position, child] of children.entries()) {
          await repo.insertBlock({
            parentBlockId: row.id,
            type: child.data.type,
            position,
            content: child.data.content,
            config: child.data.config,
            isHidden: child.isHidden,
          });
        }
        return singleBlockDto(repo, row.id);
      });
    },

    // Replaces content and/or config whole, or hides/shows the block.
    async update(
      blockId: string,
      input: { content?: Record<string, unknown>; config?: Record<string, unknown>; isHidden?: boolean },
    ): Promise<BlockDto> {
      return transaction(db, async (tx) => {
        const { repo, block, parent, owner } = await lockedBlock(tx, blockId);
        const data = parseBlock(
          { type: block.type, content: input.content ?? block.content, config: input.config ?? block.config },
          { owner: owner.kind, parentType: parent?.type ?? null },
        );
        assertMediaFits(data, await placedMedia(repo, blockId));
        await repo.updateBlock(blockId, {
          content: data.content,
          config: data.config,
          ...(input.isHidden === undefined ? {} : { isHidden: input.isHidden }),
        });
        return singleBlockDto(repo, blockId);
      });
    },

    async remove(blockId: string) {
      await transaction(db, async (tx) => {
        const { repo, block, container } = await lockedBlock(tx, blockId);
        await repo.deleteBlock(blockId);
        await repo.closeGap(container, block.position);
      });
    },

    // Deep copy directly after the source: children and placements included,
    // Media Library assets never (CLAUDE.md §17.17).
    async duplicate(blockId: string): Promise<BlockDto> {
      return transaction(db, async (tx) => {
        const { repo, block, container } = await lockedBlock(tx, blockId);
        await repo.shiftRight(container, block.position + 1);
        const copyRow = async (source: BlockRow, placement: { parentBlockId: string } | null, position: number) => {
          const row = await repo.insertBlock({
            ...(placement ?? (source.parentBlockId ? { parentBlockId: source.parentBlockId } : { projectId: source.projectId, pageId: source.pageId })),
            type: source.type,
            position,
            content: source.content,
            config: source.config,
            isHidden: source.isHidden,
          });
          const placements = await repo.listPlacements([source.id]);
          await repo.insertPlacements(
            placements.map((p) => ({
              blockId: row.id,
              mediaId: p.mediaId,
              position: p.position,
              altText: p.altText,
              posterMediaId: p.posterMediaId,
              config: p.config,
            })),
          );
          return row;
        };
        const copy = await copyRow(block, null, block.position + 1);
        for (const child of await repo.listChildren(block.id)) {
          await copyRow(child, { parentBlockId: copy.id }, child.position);
        }
        return singleBlockDto(repo, copy.id);
      });
    },

    // The complete set of one container, in its new order (ADR-0002).
    async reorder(owner: Owner, parentBlockId: string | null, blockIds: string[]) {
      await transaction(db, async (tx) => {
        const repo = createCompositionRepository(tx);
        if (!(await repo.lockOwner(owner))) throw ownerNotFound(owner);
        if (parentBlockId) {
          const parent = await repo.findBlock(parentBlockId);
          if (!parent || !isOwnedRoot(parent, owner)) throw blockNotFound();
        }
        const current = await repo.listContainer({ owner, parentBlockId });
        const ids = new Set(current.map((b) => b.id));
        if (current.length !== blockIds.length || !blockIds.every((id) => ids.has(id))) {
          throw conflict("REORDER_SET_MISMATCH", "The order must list every block of the container exactly once.");
        }
        await repo.setBlockPositions(blockIds);
      });
    },

    // Moves a block into another container of the same owner: the owner's
    // root or a top-level GRID (ADR-0006, one level). The block is validated
    // in its new container with its placements, the source closes its gap and
    // the target shifts right, all in one transaction. Leaving a GRID drops
    // the block's grid placement, which means nothing at the top level.
    // Preset containers keep their contracts, so nothing moves into or out of
    // one, and the title-overlay HERO stays the opening of its page.
    async move(blockId: string, input: { parentBlockId: string | null; position?: number }): Promise<BlockDto> {
      return transaction(db, async (tx) => {
        const { repo, block, parent, owner, container } = await lockedBlock(tx, blockId);
        const moveIssue = (message: string) => validationError([{ path: "parentBlockId", message }]);
        const presetOf = (row: BlockRow | null) => (row ? (row.config as { preset?: string }).preset : undefined);
        let target: BlockRow | null = null;
        if (input.parentBlockId) {
          if (input.parentBlockId === block.id) throw moveIssue("a block cannot contain itself");
          target = await repo.findBlock(input.parentBlockId);
          if (!target || !isOwnedRoot(target, owner) || target.type !== "GRID") {
            throw moveIssue("must be a top-level GRID of the same page, or null for the top level");
          }
          if (presetOf(target)) throw moveIssue(`a ${presetOf(target)} preset keeps its own blocks`);
        }
        if (presetOf(parent)) throw moveIssue(`a ${presetOf(parent)} preset keeps its own blocks`);
        const current = block.config as Record<string, unknown>;
        if (block.type === "HERO" && (current.overlay as { enabled?: boolean } | undefined)?.enabled && target) {
          throw moveIssue("the title-overlay HERO opens its page and stays at the top level");
        }
        const config = target ? current : Object.fromEntries(Object.entries(current).filter(([key]) => key !== "placement"));
        const data = parseBlock(
          { type: block.type, content: block.content, config },
          { owner: owner.kind, parentType: target ? "GRID" : null },
        );
        const items = await placedMedia(repo, blockId);
        for (const item of items) {
          parseBlockMediaConfig(item.config, { blockType: block.type, parentType: target ? "GRID" : null });
        }
        assertMediaFits(data, items);

        const destination: Container = { owner, parentBlockId: target?.id ?? null };
        const sameContainer = destination.parentBlockId === container.parentBlockId;
        const n = (await repo.countContainer(destination)) - (sameContainer ? 1 : 0);
        const position = input.position ?? n;
        if (position > n) throw positionIssue(n);
        if (!target && position === 0) {
          const [first] = (await repo.listContainer(destination)).filter((row) => row.id !== block.id);
          const firstOverlay = (first?.config as { overlay?: { enabled?: boolean } } | undefined)?.overlay?.enabled;
          if (first?.type === "HERO" && firstOverlay) {
            throw validationError([{ path: "position", message: "the title-overlay HERO stays first; move below it" }]);
          }
        }

        // Leave the source (closing its gap), then enter the target. The
        // moved row's own position is written last, so the shifts may touch it.
        await repo.closeGap(container, block.position);
        await repo.shiftRight(destination, position);
        await repo.placeBlock(blockId, {
          parentBlockId: target?.id ?? null,
          projectId: !target && owner.kind === "project" ? owner.id : null,
          pageId: !target && owner.kind === "page" ? owner.id : null,
          position,
          config: data.config,
        });
        return singleBlockDto(repo, blockId);
      });
    },

    // ---- Placements ----

    async addMedia(
      blockId: string,
      input: {
        mediaId: string;
        position?: number;
        altText?: string | null;
        posterMediaId?: string | null;
        config?: Record<string, unknown>;
      },
    ) {
      return transaction(db, async (tx) => {
        const { repo, block, parent, parsed } = await lockedBlock(tx, blockId);
        const data = parsed();
        const asset = await createMediaRepository(tx).findById(input.mediaId, "share");
        if (!asset || asset.status !== "READY") {
          throw invalid("INVALID_MEDIA_FOR_BLOCK", "Only ready media from the Media Library can be placed.");
        }
        const config = parseBlockMediaConfig(input.config ?? {}, { blockType: block.type, parentType: parent?.type ?? null });
        const existing = await placedMedia(repo, blockId);
        assertMediaFits(data, [...existing, { media: asset, config }]);
        if (input.posterMediaId) await assertPosterTarget(tx, input.posterMediaId, asset);
        const n = existing.length;
        const position = input.position ?? n;
        if (position > n) throw positionIssue(n);
        await repo.shiftPlacementsRight(blockId, position);
        const row = await repo.insertPlacement({
          blockId,
          mediaId: asset.id,
          position,
          altText: input.altText ?? null,
          posterMediaId: input.posterMediaId ?? null,
          config,
        });
        return placementDto(repo, row.id, blockId);
      });
    },

    async updateMedia(
      blockId: string,
      blockMediaId: string,
      input: { altText?: string | null; posterMediaId?: string | null; config?: Record<string, unknown> },
    ) {
      return transaction(db, async (tx) => {
        const { repo, block, parent, parsed } = await lockedBlock(tx, blockId);
        const data = parsed();
        const existing = await placedMedia(repo, blockId);
        const target = existing.find((item) => item.placement.id === blockMediaId);
        if (!target) throw notFound("BLOCK_MEDIA_NOT_FOUND", "Block media not found.");
        const config =
          input.config === undefined
            ? target.config
            : parseBlockMediaConfig(input.config, { blockType: block.type, parentType: parent?.type ?? null });
        assertMediaFits(
          data,
          existing.map((item) => (item === target ? { ...item, config } : item)),
        );
        if (input.posterMediaId) await assertPosterTarget(tx, input.posterMediaId, target.media);
        await repo.updatePlacement(blockMediaId, {
          ...(input.altText === undefined ? {} : { altText: input.altText }),
          ...(input.posterMediaId === undefined ? {} : { posterMediaId: input.posterMediaId }),
          config,
        });
        return placementDto(repo, blockMediaId, blockId);
      });
    },

    async removeMedia(blockId: string, blockMediaId: string) {
      await transaction(db, async (tx) => {
        const { repo } = await lockedBlock(tx, blockId);
        const placement = await repo.findPlacement(blockId, blockMediaId);
        if (!placement) throw notFound("BLOCK_MEDIA_NOT_FOUND", "Block media not found.");
        await repo.deletePlacement(blockMediaId);
        await repo.closePlacementGap(blockId, placement.position);
      });
    },

    async reorderMedia(blockId: string, blockMediaIds: string[]) {
      await transaction(db, async (tx) => {
        const { repo } = await lockedBlock(tx, blockId);
        const current = await repo.listPlacements([blockId]);
        const ids = new Set(current.map((p) => p.id));
        if (current.length !== blockMediaIds.length || !blockMediaIds.every((id) => ids.has(id))) {
          throw conflict("REORDER_SET_MISMATCH", "The order must list every media item of the block exactly once.");
        }
        await repo.setPlacementPositions(blockMediaIds);
      });
    },
  };
}

async function placementDto(repo: CompositionRepository, id: string, blockId: string) {
  const placement = (await repo.findPlacement(blockId, id))!;
  const [asset] = await repo.findMediaRows([placement.mediaId]);
  const media = await repo.findMediaRows([asset.id, ...placementMediaIds([placement], [asset])]);
  return toBlockMediaDto(placement, new Map(media.map((m) => [m.id, m])));
}

export type CompositionService = ReturnType<typeof createCompositionService>;
