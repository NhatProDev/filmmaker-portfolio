import type { BlockMediaRecord } from "@/features/project-builder/block.repository";
import type { BlockData, Playback } from "@/features/project-builder/block.schema";
import { presetFor } from "@/features/project-builder/presets";
import type { PublicProjectRecord } from "@/features/projects/project.repository";
import { projectCreditsSchema } from "@/features/projects/project.schema";
import {
  altFor,
  fail,
  image,
  liveMedia,
  onlyMedia,
  poster,
  richText,
  videoSrc,
  type MediaIndex,
  type ParsedBlock,
} from "./db-projection";
import type {
  GalleryLayout,
  ProjectBlock,
  ProjectCredit,
  ProjectFacts,
  ProjectImage,
  ProjectLeafBlock,
  ProjectMedia,
  ProjectVideo,
  WorksCover,
} from "./site-content.types";

// The generic Project Detail projection (Phase 3A): any valid composition of
// the seven block types becomes the renderer's view model, block by block, in
// stored order. Presets (ADR-0013) are validated against their own contract
// and keep the locked page's derivations; everything else renders by type.
//
// A composition the renderer cannot draw faithfully is refused with the
// reason, never repaired: nothing is silently dropped, reordered or invented
// (ADR-0013 §4). The one derivation is structural: every Project Detail page
// opens with its title, so a composition that does not start with the
// title-overlay HERO opens on the project's cover.

export type ProjectPageContent = { facts: ProjectFacts; credits: ProjectCredit[]; blocks: ProjectBlock[] };

const at = (where: string, block: ParsedBlock) => `${where}, block ${block.id}`;

// The poster chain (ADR-0015) as far as a snapshot can follow it: the
// placement's override, then the asset's default, then an empty frame.
function optionalPoster(index: MediaIndex, item: BlockMediaRecord, where: string): ProjectImage | null {
  const video = liveMedia(index, item.mediaId, where);
  const posterId = item.posterMediaId ?? video.posterMediaId;
  return posterId ? image(index, posterId, altFor(index, item), where) : null;
}

// Per-item override, then the block's default, then the surface's default
// (ADR-0008 precedence).
function playbackOf(item: BlockMediaRecord, blockDefault: Playback | undefined, surfaceDefault: Playback["mode"]) {
  const override = (item.config as { playback?: Playback } | null)?.playback;
  return override?.mode ?? blockDefault?.mode ?? surfaceDefault;
}

function mediaOf(index: MediaIndex, item: BlockMediaRecord, playback: Playback["mode"], where: string): ProjectMedia {
  const asset = liveMedia(index, item.mediaId, where);
  if (asset.type === "IMAGE") return { kind: "image", image: image(index, asset.id, altFor(index, item), where) };
  const video: ProjectVideo = {
    src: videoSrc(index, asset.id, where),
    width: asset.width,
    height: asset.height,
    poster: optionalPoster(index, item, where),
    playback,
  };
  return { kind: "video", video };
}

function requireMedia(block: ParsedBlock, where: string): BlockMediaRecord {
  if (!block.media.length) fail(where, `this ${block.data.type} has no media yet — add it, hide the block or remove it`);
  return onlyMedia(block, where);
}

// ---- Leaf blocks, at the root or inside a GRID ----

function leaf(index: MediaIndex, block: ParsedBlock, where: string, nested: boolean): ProjectLeafBlock {
  const { data, id } = block;
  switch (data.type) {
    case "TEXT":
      if (data.content.kind === "richText") {
        return { type: "text", id, role: data.config.role ?? null, text: { kind: "richText", paragraphs: data.content.paragraphs } };
      }
      return { type: "text", id, role: data.config.role ?? null, text: { kind: data.content.kind } };
    case "IMAGE": {
      if (data.config.preset) {
        fail(where, `the ${data.config.preset} preset is a full-width block of the page and cannot sit inside a GRID`);
      }
      const item = requireMedia(block, where);
      const asset = liveMedia(index, item.mediaId, where);
      if (asset.type !== "IMAGE") fail(where, `an IMAGE block shows an image, not ${asset.type}`);
      return {
        type: "image",
        id,
        image: image(index, asset.id, altFor(index, item), where),
        fit: data.config.fit ?? "CONTAIN",
        caption: data.content.caption ?? null,
      };
    }
    case "VIDEO": {
      const item = requireMedia(block, where);
      const media = mediaOf(index, item, playbackOf(item, data.config.playback, "CLICK_TO_PLAY"), where);
      if (media.kind !== "video") fail(where, "a VIDEO block plays a video, not an image");
      return { type: "video", id, video: media.video, fit: data.config.fit ?? "COVER" };
    }
    case "HERO": {
      const item = requireMedia(block, where);
      return {
        type: "hero",
        id,
        media: mediaOf(index, item, playbackOf(item, data.config.playback, "CLICK_TO_PLAY"), where),
        fit: data.config.fit ?? "COVER",
        caption: data.content.caption ?? null,
      };
    }
    case "SPACER":
      return { type: "spacer", id, size: data.config.size };
    default:
      // Parsing already refuses a GRID or GALLERY inside a GRID.
      return fail(where, `a ${data.type} cannot be ${nested ? "nested" : "a leaf"}`);
  }
}

// ---- The opening ----

function openingOf(index: MediaIndex, block: ParsedBlock, cover: WorksCover, where: string): ProjectBlock {
  const data = block.data as Extract<BlockData, { type: "HERO" }>;
  const { overlay, playback } = data.config;
  if (data.content.caption) fail(where, "the opening HERO carries no caption; its title is the project's");
  if (
    !overlay?.enabled ||
    overlay.anchor !== "bottom-start" ||
    overlay.colStart !== 1 ||
    overlay.colSpan !== 8 ||
    !overlay.showBackToWorks
  ) {
    fail(where, "the opening HERO renders its title overlay bottom-start on columns 1–8, with Back to works");
  }
  if (block.media.length === 0) return { type: "opening", id: block.id, image: { ...cover, alt: "" } };
  const item = onlyMedia(block, where);
  const asset = liveMedia(index, item.mediaId, where);
  if (asset.type === "IMAGE") return { type: "opening", id: block.id, image: image(index, asset.id, altFor(index, item), where) };
  if (playback?.mode !== "CLICK_TO_PLAY") fail(where, "the opening film is CLICK_TO_PLAY");
  if (!asset.width || !asset.height) fail(where, `video ${asset.id} has no dimensions`);
  return {
    type: "opening",
    id: block.id,
    image: poster(index, item, altFor(index, item), where),
    film: { src: videoSrc(index, asset.id, where), width: asset.width, height: asset.height },
  };
}

// ---- Presets (ADR-0013) ----

function presetBlock(index: MediaIndex, block: ParsedBlock, preset: string, where: string): ProjectBlock {
  const { id, children } = block;
  switch (preset) {
    case "projectMeta": {
      const [facts, statement, ...rest] = children;
      if (!facts || facts.data.type !== "TEXT" || facts.data.content.kind !== "projectFacts") {
        fail(where, "projectMeta starts with the derived facts");
      }
      if (rest.length) fail(where, "projectMeta holds the facts and at most one statement");
      if (!statement) return { type: "projectMeta", id, statement: null };
      const [lead, body] = richText(statement, "statement", 2, `${where}, statement`);
      return { type: "projectMeta", id, statement: { lead, body } };
    }
    case "projectStills": {
      if (!children.length) fail(where, "projectStills has no stills yet — add one, hide the block or remove it");
      const stills = children.map((child) => {
        if (child.data.type !== "IMAGE") fail(where, "projectStills holds IMAGE blocks only");
        const item = requireMedia(child, at(where, child));
        return image(index, item.mediaId, altFor(index, item), where);
      });
      return { type: "projectStills", id, stills };
    }
    case "projectLoop": {
      const [video, caption, ...rest] = children;
      if (!video || video.data.type !== "VIDEO" || video.data.config.playback.mode !== "AUTOPLAY_VISIBLE") {
        fail(where, "projectLoop starts with an AUTOPLAY_VISIBLE VIDEO");
      }
      if (!caption || rest.length) fail(where, "projectLoop holds the video and its caption");
      const item = requireMedia(video, at(where, video));
      return {
        type: "projectLoop",
        id,
        src: videoSrc(index, item.mediaId, where),
        poster: poster(index, item, altFor(index, item), where),
        caption: richText(caption, "caption", 1, `${where}, caption`)[0],
      };
    }
    case "projectCredits": {
      const [credits, ...rest] = children;
      if (!credits || rest.length || credits.data.type !== "TEXT" || credits.data.content.kind !== "projectCredits") {
        fail(where, "projectCredits holds the derived credits");
      }
      return { type: "projectCredits", id };
    }
    case "projectCoda": {
      const item = requireMedia(block, where);
      return { type: "projectCoda", id, image: image(index, item.mediaId, altFor(index, item), where) };
    }
    default:
      return fail(where, `the ${preset} preset belongs to ${presetFor(preset)?.owner === "page" ? "Home" : "no Project Detail block"}`);
  }
}

// ---- Root blocks ----

function rootBlock(index: MediaIndex, block: ParsedBlock, where: string): ProjectBlock {
  const { data, id } = block;
  const preset = "preset" in data.config ? (data.config.preset as string | undefined) : undefined;
  if (preset) return presetBlock(index, block, preset, where);

  if (data.type === "GRID") {
    if (!block.children.length) fail(where, "this GRID has no blocks yet — add one, hide the GRID or remove it");
    return {
      type: "grid",
      id,
      cells: block.children.map((child) => {
        const placement = "placement" in child.data.config ? (child.data.config.placement ?? null) : null;
        return { placement, block: leaf(index, child, at(where, child), true) };
      }),
    };
  }

  if (data.type === "GALLERY") {
    if (!block.media.length) fail(where, "this GALLERY has no media yet — add some, hide it or remove it");
    const config = data.config;
    const layout: GalleryLayout =
      config.mode === "VIDEO_GRID" ? { mode: "VIDEO_GRID", columns: config.columns, fit: config.fit ?? "COVER" } : { mode: config.mode };
    const blockDefault = config.mode === "VIDEO_GRID" ? config.playback : undefined;
    const items = block.media.map((item) => mediaOf(index, item, playbackOf(item, blockDefault, "AUTOPLAY_VISIBLE"), where));
    if (layout.mode === "JUSTIFIED_ROWS" && items.some((item) => item.kind === "video")) {
      fail(where, "JUSTIFIED_ROWS lays out stills; for video choose VIDEO_GRID, HORIZONTAL_STRIP or SLIDESHOW");
    }
    return { type: "gallery", id, label: data.content.label ?? null, layout, items };
  }

  return leaf(index, block, where, false);
}

// ---- The page ----

export function projectPageContent(project: PublicProjectRecord, tree: ParsedBlock[], index: MediaIndex, cover: WorksCover): ProjectPageContent {
  const where = `project ${project.slug}`;
  if (project.year === null) fail(where, "a public project needs a year");
  const facts: ProjectFacts = {
    year: project.year,
    ...(project.runtime !== null ? { runtime: project.runtime } : {}),
    ...(project.client !== null ? { client: project.client } : {}),
    ...(project.role !== null ? { role: project.role } : {}),
  };
  const parsedCredits = projectCreditsSchema.safeParse(project.credits);
  if (!parsedCredits.success) fail(where, "projects.credits is not a valid credit list");

  // No composition yet: the page shows its identity — the cover and the facts.
  if (!tree.length) {
    return {
      facts,
      credits: parsedCredits.data,
      blocks: [
        { type: "opening", id: "opening", image: { ...cover, alt: "" } },
        { type: "projectMeta", id: "facts", statement: null },
      ],
    };
  }

  const blocks: ProjectBlock[] = [];
  tree.forEach((block, i) => {
    const place = at(where, block);
    const opens = block.data.type === "HERO" && Boolean(block.data.config.overlay?.enabled);
    if (opens) {
      if (i !== 0) fail(place, "the title-overlay HERO opens the page, so it comes first");
      blocks.push(openingOf(index, block, cover, place));
      return;
    }
    if (i === 0) blocks.push({ type: "opening", id: "opening", image: { ...cover, alt: "" } });
    blocks.push(rootBlock(index, block, place));
  });
  return { facts, credits: parsedCredits.data, blocks };
}
