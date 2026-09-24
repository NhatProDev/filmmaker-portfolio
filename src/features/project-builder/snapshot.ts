import { z } from "zod";
import type { Database } from "@db/client";
import { createMediaRepository, type MediaRecord } from "@/features/media/media.repository";
import { createBlockRepository, type BlockRecord } from "./block.repository";
import { BLOCK_TYPES } from "./block.schema";
import type { Owner } from "./composition.repository";

// A composition as it is published (ADR-0012): the visible blocks of a working
// copy, in order, with every media record they need. Hidden blocks are never
// published. Media are copied as records, not URLs; delivery URLs are derived
// when the snapshot is read (ADR-0014).

const uuid = z.uuid();

const placementSchema = z.strictObject({
  id: uuid,
  mediaId: uuid,
  position: z.int().min(0),
  altText: z.string().nullable(),
  posterMediaId: uuid.nullable(),
  config: z.unknown(),
});

const leafSchema = z.strictObject({
  id: uuid,
  type: z.enum(BLOCK_TYPES),
  position: z.int().min(0),
  content: z.unknown(),
  config: z.unknown(),
  media: z.array(placementSchema),
  children: z.array(z.never()).max(0),
});

const rootSchema = leafSchema.extend({ children: z.array(leafSchema) });

export const snapshotMediaSchema = z.strictObject({
  id: uuid,
  type: z.enum(["IMAGE", "VIDEO", "EXTERNAL_VIDEO"]),
  status: z.enum(["UPLOADING", "PROCESSING", "READY", "FAILED"]),
  storageProvider: z.string().nullable(),
  storageKey: z.string().nullable(),
  mimeType: z.string().nullable(),
  width: z.int().positive().nullable(),
  height: z.int().positive().nullable(),
  durationMs: z.int().min(0).nullable(),
  altText: z.string().nullable(),
  posterMediaId: uuid.nullable(),
});

// Validated at runtime to exactly one level of nesting; typed as the block
// records the projection consumes.
export const compositionSnapshotShape = {
  blocks: z.array(rootSchema) as unknown as z.ZodType<BlockRecord[]>,
  media: z.array(snapshotMediaSchema),
};

export type CompositionSnapshot = { blocks: BlockRecord[]; media: MediaRecord[] };

// Every media id a composition references: placed assets and placement posters.
export function treeMediaIds(blocks: BlockRecord[]): string[] {
  return blocks.flatMap((block) => [
    ...block.media.flatMap((item) => (item.posterMediaId ? [item.mediaId, item.posterMediaId] : [item.mediaId])),
    ...treeMediaIds(block.children),
  ]);
}

// The visible composition of an owner's working copy, plus `extraMediaIds`
// (a project's cover and preview), with the default posters of every asset.
export async function readComposition(
  db: Database,
  owner: Owner,
  extraMediaIds: readonly (string | null)[] = [],
): Promise<CompositionSnapshot> {
  const repository = createBlockRepository(db);
  const blocks =
    owner.kind === "project"
      ? await repository.listVisibleTreeForProject(owner.id)
      : await repository.listVisibleTreeForPage(owner.id);
  const media = createMediaRepository(db);
  const wanted = [...new Set([...treeMediaIds(blocks), ...extraMediaIds.filter((id): id is string => Boolean(id))])];
  const assets = await media.findLiveByIds(wanted);
  const posterIds = assets
    .map((asset) => asset.posterMediaId)
    .filter((id): id is string => id !== null && !wanted.includes(id));
  const posters = await media.findLiveByIds([...new Set(posterIds)]);
  const records = [...assets, ...posters].sort((a, b) => a.id.localeCompare(b.id));
  return { blocks, media: records };
}

// JSON with object keys sorted, so two snapshots compare by content.
export function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
}
