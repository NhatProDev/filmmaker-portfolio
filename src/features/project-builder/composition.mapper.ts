import { toMediaDto, toMediaRef } from "@/features/media/media.mapper";
import type { BlockMediaRow, BlockRow, MediaRow } from "./composition.repository";

// Block DTOs (openapi.yaml `Block`, `BlockMedia`). `content` and `config` were
// validated on write and are returned as stored.

export type BlockMediaDto = ReturnType<typeof toBlockMediaDto>;

export type BlockDto = {
  id: string;
  type: BlockRow["type"];
  position: number;
  parentBlockId: string | null;
  isHidden: boolean;
  content: unknown;
  config: unknown;
  media: BlockMediaDto[];
  children: BlockDto[];
  createdAt: string;
  updatedAt: string;
};

// The media ids a set of placements needs for its DTOs: the placed assets,
// their default posters and any placement posters.
export function placementMediaIds(placements: BlockMediaRow[], assets: MediaRow[] = []): string[] {
  return [
    ...placements.flatMap((p) => [p.mediaId, ...(p.posterMediaId ? [p.posterMediaId] : [])]),
    ...assets.flatMap((a) => (a.posterMediaId ? [a.posterMediaId] : [])),
  ];
}

export function toBlockMediaDto(placement: BlockMediaRow, mediaById: Map<string, MediaRow>) {
  const asset = mediaById.get(placement.mediaId)!;
  const assetPoster = asset.posterMediaId ? mediaById.get(asset.posterMediaId) ?? null : null;
  const placementPoster = placement.posterMediaId ? mediaById.get(placement.posterMediaId) ?? null : null;
  return {
    id: placement.id,
    position: placement.position,
    mediaId: placement.mediaId,
    altText: placement.altText,
    posterMediaId: placement.posterMediaId,
    poster: placementPoster ? toMediaRef(placementPoster) : null,
    config: placement.config,
    media: toMediaDto(asset, assetPoster),
    createdAt: placement.createdAt.toISOString(),
  };
}

// Builds the DTO tree for `rows` (roots and their children, in any order).
export function toBlockTree(rows: BlockRow[], placements: BlockMediaRow[], mediaById: Map<string, MediaRow>): BlockDto[] {
  const byBlock = new Map<string, BlockMediaDto[]>();
  for (const placement of placements) {
    const list = byBlock.get(placement.blockId) ?? [];
    list.push(toBlockMediaDto(placement, mediaById));
    byBlock.set(placement.blockId, list);
  }
  const dto = (row: BlockRow): BlockDto => ({
    id: row.id,
    type: row.type,
    position: row.position,
    parentBlockId: row.parentBlockId,
    isHidden: row.isHidden,
    content: row.content,
    config: row.config,
    media: (byBlock.get(row.id) ?? []).sort((a, b) => a.position - b.position),
    children: [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
  const ids = new Set(rows.map((row) => row.id));
  const all = new Map(rows.map((row) => [row.id, dto(row)]));
  const roots: BlockDto[] = [];
  for (const row of rows) {
    const node = all.get(row.id)!;
    if (row.parentBlockId && ids.has(row.parentBlockId)) all.get(row.parentBlockId)!.children.push(node);
    else roots.push(node);
  }
  const byPosition = (a: BlockDto, b: BlockDto) => a.position - b.position || a.id.localeCompare(b.id);
  for (const node of all.values()) node.children.sort(byPosition);
  return roots.sort(byPosition);
}
