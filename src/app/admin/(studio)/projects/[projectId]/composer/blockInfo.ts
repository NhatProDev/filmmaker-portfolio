import type { BlockDto, BlockMediaDto } from "@/features/project-builder/composition.mapper";
import { presetFor } from "@/features/project-builder/presets";
import { thumbnailUrl } from "../../../../_components/Thumb";

// How the composer names and summarises a block. Pure: derived from the
// block's stored type, content and config, never stored.

export type Block = BlockDto;

type Config = {
  preset?: string;
  overlay?: { enabled?: boolean };
  mode?: string;
  role?: string;
  size?: string;
  playback?: { mode?: string };
  fit?: string;
  placement?: unknown;
};

export const configOf = (block: Block) => (block.config ?? {}) as Config;
export const presetOf = (block: Block) => configOf(block).preset;
export const isOpening = (block: Block) => block.type === "HERO" && Boolean(configOf(block).overlay?.enabled);

const TYPE_LABELS: Record<Block["type"], string> = {
  HERO: "Full-bleed media",
  TEXT: "Text",
  IMAGE: "Image",
  VIDEO: "Video",
  GRID: "Columns",
  GALLERY: "Gallery",
  SPACER: "Space",
};

export const GALLERY_MODES: Record<string, string> = {
  JUSTIFIED_ROWS: "Justified rows",
  HORIZONTAL_STRIP: "Horizontal strip",
  SLIDESHOW: "Slideshow",
  VIDEO_GRID: "Video wall",
};

export const TEXT_ROLE_LABELS: Record<string, string> = {
  body: "Body",
  lead: "Lead",
  statement: "Statement",
  aside: "Aside",
  caption: "Caption",
  display: "Display",
  more: "Small caps line",
};

export function labelOf(block: Block): string {
  if (isOpening(block)) return "Opening";
  const preset = presetOf(block);
  if (preset) return presetFor(preset)?.label ?? preset;
  if (block.type === "GALLERY") return `Gallery · ${GALLERY_MODES[configOf(block).mode ?? ""] ?? "?"}`;
  if (block.type === "TEXT") {
    const kind = (block.content as { kind?: string }).kind;
    if (kind === "projectFacts") return "Facts";
    if (kind === "projectCredits") return "Credits";
    return `Text · ${TEXT_ROLE_LABELS[configOf(block).role ?? "body"] ?? "Body"}`;
  }
  return TYPE_LABELS[block.type];
}

function plainText(block: Block): string {
  const paragraphs = (block.content as { paragraphs?: unknown[][] }).paragraphs ?? [];
  return paragraphs
    .map((p) => p.map((run) => (typeof run === "string" ? run : (run as { em?: string; link?: { text: string } }).em ?? (run as { link?: { text: string } }).link?.text ?? "")).join(""))
    .join(" ");
}

const clip = (text: string, max = 90) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export function summaryOf(block: Block): string {
  const media = block.media.length;
  switch (block.type) {
    case "HERO":
      if (isOpening(block)) {
        const item = block.media[0];
        return item ? `${item.media.type === "IMAGE" ? "Image" : "Film"} under the title` : "The project's cover under the title";
      }
      return media ? (block.media[0].media.type === "IMAGE" ? "Image" : "Video") : "No media yet";
    case "TEXT": {
      const kind = (block.content as { kind?: string }).kind;
      if (kind === "projectFacts") return "Year, runtime, client and role, from Details";
      if (kind === "projectCredits") return "The credit list, from Details";
      return clip(plainText(block));
    }
    case "IMAGE":
      return media ? ((block.content as { caption?: string }).caption ?? "") : "No image yet";
    case "VIDEO":
      return media ? `Plays ${playbackLabel(configOf(block).playback?.mode)}` : "No video yet";
    case "GRID": {
      const preset = presetOf(block);
      if (preset === "projectMeta") {
        const statement = block.children[1];
        return statement ? clip(plainText(statement)) : "Facts only — no statement";
      }
      if (preset === "projectStills") return `${block.children.length} still(s)`;
      if (preset === "projectLoop") return block.children[1] ? clip(plainText(block.children[1])) : "Loop without caption";
      if (preset === "projectCredits") return "The credit list, from Details";
      return `${block.children.length} block(s) on 12 columns`;
    }
    case "GALLERY":
      return `${media} item(s)`;
    case "SPACER":
      return { S: "Small", M: "Medium", L: "Large" }[configOf(block).size ?? "M"] ?? "";
  }
}

export function playbackLabel(mode: string | undefined): string {
  if (mode === "AUTOPLAY_VISIBLE") return "silently while visible";
  if (mode === "AUTOPLAY_AMBIENT") return "silently as ambience";
  return "on request, with sound";
}

const placementThumb = (item: BlockMediaDto) =>
  item.media.type === "IMAGE" ? thumbnailUrl(item.media) : (thumbnailUrl(item.poster) ?? thumbnailUrl(item.media));

// Up to four thumbnails: the block's own media, then its children's.
export function thumbsOf(block: Block): string[] {
  const urls = [...block.media, ...block.children.flatMap((child) => child.media)].map(placementThumb);
  return urls.filter((url): url is string => Boolean(url)).slice(0, 4);
}

// What the page needs before it can show this block; null when complete.
// Mirrors what Publish refuses (src/features/site-content/project-blocks.ts).
export function needsOf(block: Block): string | null {
  const preset = presetOf(block);
  if (isOpening(block)) return null;
  if (preset === "projectStills") return block.children.length ? childNeeds(block) : "Add at least one still";
  if (preset === "projectLoop") {
    const [video, caption] = block.children;
    if (!video?.media.length) return "Choose the loop's video";
    if (!caption) return "Write the loop's caption";
    return null;
  }
  if (preset === "projectMeta" || preset === "projectCredits") return null;
  switch (block.type) {
    case "IMAGE":
      return block.media.length ? null : "Choose an image";
    case "VIDEO":
      return block.media.length ? null : "Choose a video";
    case "HERO":
      return block.media.length ? null : "Choose an image or a film";
    case "GALLERY":
      return block.media.length ? null : "Add media";
    case "GRID":
      return block.children.length ? childNeeds(block) : "Add a block to the columns";
    default:
      return null;
  }
}

function childNeeds(block: Block): string | null {
  const incomplete = block.children.filter((child) => !child.isHidden && needsOf(child));
  return incomplete.length ? `${incomplete.length} block(s) inside need media` : null;
}
