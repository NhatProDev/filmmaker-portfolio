import type { Media as MediaRow } from "@db/schema";
import type { BlockData, BlockMediaConfig, BlockType, Playback } from "./block.schema";

// What each block type accepts as media, and the playback rules that depend on
// the media placed in it (CLAUDE.md §13, ADR-0008, ADR-0010). These are
// cross-row rules, so they live beside the services, not in the Zod schemas.

type MediaType = MediaRow["type"];

export const BLOCK_MEDIA_RULES: Record<BlockType, { accepts: readonly MediaType[]; max: number }> = {
  HERO: { accepts: ["IMAGE", "VIDEO", "EXTERNAL_VIDEO"], max: 1 },
  IMAGE: { accepts: ["IMAGE"], max: 1 },
  VIDEO: { accepts: ["VIDEO", "EXTERNAL_VIDEO"], max: 1 },
  // EXTERNAL_VIDEO supports CLICK_TO_PLAY only, which no gallery flow offers.
  GALLERY: { accepts: ["IMAGE", "VIDEO"], max: 60 },
  TEXT: { accepts: [], max: 0 },
  GRID: { accepts: [], max: 0 },
  SPACER: { accepts: [], max: 0 },
};

// Blocks that render nothing without their one media item.
export const REQUIRES_MEDIA: readonly BlockType[] = ["HERO", "IMAGE", "VIDEO"];

// Precedence: per-item override > block default > mode default (CLAUDE.md §13).
export function effectivePlaybackMode(block: BlockData, item: BlockMediaConfig = {}): Playback["mode"] | null {
  const blockPlayback =
    block.type === "HERO" || block.type === "VIDEO"
      ? block.config.playback
      : block.type === "GALLERY" && block.config.mode === "VIDEO_GRID"
        ? block.config.playback
        : undefined;
  if (item.playback) return item.playback.mode;
  if (blockPlayback) return blockPlayback.mode;
  // The system default: a HERO film is the primary film, played on request.
  if (block.type === "HERO") return "CLICK_TO_PLAY";
  if (block.type === "GALLERY") return "AUTOPLAY_VISIBLE";
  return null;
}

export type PlacedMedia = { media: Pick<MediaRow, "id" | "type" | "status">; config: BlockMediaConfig };

// Every rule a block and its placed media must satisfy together.
export function blockMediaIssues(block: BlockData, items: PlacedMedia[]): string[] {
  const rule = BLOCK_MEDIA_RULES[block.type];
  const issues: string[] = [];
  if (items.length > rule.max) {
    issues.push(
      rule.max === 0
        ? `a ${block.type} block holds no media`
        : `a ${block.type} block holds at most ${rule.max} media item${rule.max === 1 ? "" : "s"}`,
    );
  }
  for (const { media, config } of items) {
    if (!rule.accepts.includes(media.type)) {
      issues.push(`a ${block.type} block does not accept ${media.type} media`);
      continue;
    }
    if (media.type === "IMAGE" && config.playback) issues.push("playback applies only to video");
    const mode = effectivePlaybackMode(block, config);
    if (media.type === "EXTERNAL_VIDEO" && mode !== "CLICK_TO_PLAY") {
      issues.push("external video supports CLICK_TO_PLAY only");
    }
    if (
      block.type === "HERO" &&
      block.config.overlay?.enabled &&
      media.type !== "IMAGE" &&
      mode !== "CLICK_TO_PLAY"
    ) {
      issues.push("the title overlay is valid only on an image HERO or a CLICK_TO_PLAY video HERO");
    }
  }
  return issues;
}
