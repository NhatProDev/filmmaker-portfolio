import { api } from "../../../../_components/api";
import { configOf, isOpening, labelOf, presetOf, type Block } from "./blockInfo";

// Where a block may move (Phase 3B). This mirrors the service's rules so the
// Studio can say why before the request; the API, the block contract and the
// database still decide (POST /blocks/{blockId}/move, migration 0007).

export const ROOT = "root";

// One request: the server validates the block in its new container.
export const moveBlock = (blockId: string, parentBlockId: string | null, position?: number) =>
  api("POST", `/blocks/${blockId}/move`, position === undefined ? { parentBlockId } : { parentBlockId, position });

// Why `block`, now in `from` (null: the top level), cannot move into `to`
// (null: the top level); null when it can.
export function moveRefusal(block: Block, from: Block | null, to: Block | null): string | null {
  if ((from?.id ?? ROOT) === (to?.id ?? ROOT)) return null;
  if (from && presetOf(from)) return `${labelOf(from)} keeps its own blocks.`;
  if (!to) return null;
  if (to.type !== "GRID") return "Blocks go only into Columns.";
  if (presetOf(to)) return `${labelOf(to)} keeps its own blocks.`;
  if (to.id === block.id) return "A block cannot go inside itself.";
  if (block.type === "GRID" || block.type === "GALLERY") return `${labelOf(block)} cannot go inside Columns: one level only.`;
  if (isOpening(block)) return "The opening stays at the top of the page.";
  if (presetOf(block)) return `${labelOf(block)} sits at the top level of the page.`;
  const ambient = (mode: string | undefined) => mode === "AUTOPLAY_AMBIENT";
  if (ambient(configOf(block).playback?.mode) || block.media.some((m) => ambient((m.config as { playback?: { mode?: string } }).playback?.mode))) {
    return "Ambient video plays only on its own; choose another playback before moving it into Columns.";
  }
  return null;
}

export type MoveTarget = { parentBlockId: string | null; position?: number; label: string };

// The containers a block can move to from where it is, in page order.
export function moveTargets(block: Block, from: Block | null, roots: readonly Block[]): MoveTarget[] {
  const targets: MoveTarget[] = [];
  if (from && !moveRefusal(block, from, null)) {
    // Out of the columns: directly below them.
    targets.push({ parentBlockId: null, position: roots.findIndex((root) => root.id === from.id) + 1, label: "Top level, below these columns" });
  }
  roots.forEach((root, index) => {
    if (root.type !== "GRID" || root.id === from?.id || moveRefusal(block, from, root)) return;
    targets.push({ parentBlockId: root.id, label: `Into ${String(index + 1).padStart(2, "0")} · ${labelOf(root)} (at the end)` });
  });
  return targets;
}
