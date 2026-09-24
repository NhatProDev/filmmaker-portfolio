import type { MediaRecord } from "@/features/media/media.repository";
import type { BlockMediaRecord, BlockRecord } from "@/features/project-builder/block.repository";
import {
  BlockValidationError,
  parseBlock,
  parseBlockMediaConfig,
  type BlockData,
  type BlockType,
  type Paragraph,
} from "@/features/project-builder/block.schema";
import type { PublicProjectRecord } from "@/features/projects/project.repository";
import { isPrivateKey } from "@/lib/storage/media-storage";
import { mediaUrl } from "@/lib/storage/media-url";
import type {
  HomeContent,
  HomeImage,
  ProjectImage,
  WallItem,
  WorksCover,
  WorksProject,
} from "./site-content.types";

// Maps stored rows into the view models the public pages consume: the shared
// validation and media resolution, Art Works, and Home's fixed template.
// Project Detail is composed by the generic block projection
// (project-blocks.ts). A stored composition a page cannot draw is refused:
// nothing is silently reordered, dropped or invented (ADR-0013 §4).

export class ContentProjectionError extends Error {}

export function fail(where: string, message: string): never {
  throw new ContentProjectionError(`${where}: ${message}`);
}

// The assets a composition may reference, and how each becomes a delivery URL:
// the public media path by default, an access-checked route for a PRIVATE
// project (ADR-0014 §4).
export type MediaIndex = {
  get(id: string): MediaRecord | undefined;
  url(asset: MediaRecord & { storageKey: string }): string;
};

// A private object never becomes a public URL: a public page that references
// one cannot be rendered.
export const publicMediaUrl: MediaIndex["url"] = (asset) => {
  if (isPrivateKey(asset.storageKey)) fail(`media ${asset.id}`, "is in private storage and cannot appear on a public page");
  return mediaUrl(asset.storageKey);
};

export function createMediaIndex(records: readonly MediaRecord[], url: MediaIndex["url"] = publicMediaUrl): MediaIndex {
  const byId = new Map(records.map((record) => [record.id, record]));
  return { get: (id) => byId.get(id), url };
}

export type ParsedBlock = {
  id: string;
  data: BlockData;
  media: BlockMediaRecord[];
  children: ParsedBlock[];
};

// ---- Validation of stored blocks ----

function parseAt(block: BlockRecord, owner: "project" | "page", parentType: BlockType | null, where: string) {
  try {
    const data = parseBlock({ type: block.type, content: block.content, config: block.config }, { owner, parentType });
    for (const item of block.media) parseBlockMediaConfig(item.config, { blockType: block.type, parentType });
    return data;
  } catch (error) {
    if (error instanceof BlockValidationError) fail(`${where}, block ${block.id}`, error.message);
    throw error;
  }
}

export function parseTree(blocks: BlockRecord[], owner: "project" | "page", where: string): ParsedBlock[] {
  return blocks.map((block) => ({
    id: block.id,
    data: parseAt(block, owner, null, where),
    media: block.media,
    children: block.children.map((child) => ({
      id: child.id,
      data: parseAt(child, owner, block.type, where),
      media: child.media,
      children: [],
    })),
  }));
}

export { treeMediaIds } from "@/features/project-builder/snapshot";

// ---- Media ----

export function liveMedia(index: MediaIndex, id: string, where: string): MediaRecord & { storageKey: string } {
  const asset = index.get(id);
  if (!asset) fail(where, `media ${id} is missing or deleted`);
  if (asset.status !== "READY") fail(where, `media ${id} is ${asset.status}, not READY`);
  if (!asset.storageKey) fail(where, `media ${id} has no storage key`);
  return asset as MediaRecord & { storageKey: string };
}

export function image(index: MediaIndex, id: string, alt: string, where: string): HomeImage & ProjectImage {
  const asset = liveMedia(index, id, where);
  if (asset.type !== "IMAGE") fail(where, `media ${id} is ${asset.type}, not IMAGE`);
  if (!asset.width || !asset.height) fail(where, `image ${id} has no dimensions`);
  return { src: index.url(asset), width: asset.width, height: asset.height, alt, ...activeAspectOf(asset, where) };
}

// ADR-0016: an asset's declared active picture, as an aspect ratio the
// renderer frames. Only a picture narrower in height than its file is a
// letterbox; anything else is refused rather than guessed at.
export function activeAspectOf(asset: MediaRecord, where: string): { activeAspect?: number } {
  if (!asset.activePicture) return {};
  if (!asset.width || !asset.height) fail(where, `media ${asset.id} declares an active picture but has no dimensions`);
  const active = Number(asset.activePicture);
  if (!(active > asset.width / asset.height)) {
    fail(where, `media ${asset.id} declares a ${asset.activePicture}:1 picture, which is not letterboxed inside its ${asset.width}×${asset.height} frame`);
  }
  return { activeAspect: active };
}

export function videoSrc(index: MediaIndex, id: string, where: string): string {
  const asset = liveMedia(index, id, where);
  // The locked pages play hosted video only; EXTERNAL_VIDEO has no renderer yet.
  if (asset.type !== "VIDEO") fail(where, `media ${id} is ${asset.type}, not a hosted VIDEO`);
  return index.url(asset);
}

// Poster resolution (ADR-0015): the placement's override, then the video
// asset's default. The locked pages always draw a poster image, so the next
// steps of the chain — a provider thumbnail, then an empty frame — cannot be
// rendered here, and a video with neither poster is refused.
export function poster(index: MediaIndex, item: BlockMediaRecord, alt: string, where: string) {
  const video = liveMedia(index, item.mediaId, where);
  const posterId = item.posterMediaId ?? video.posterMediaId;
  if (!posterId) fail(where, `video ${video.id} has no poster`);
  return image(index, posterId, alt, where);
}

// Placement override, then the asset's default, then decorative (ADR-0011).
export function altFor(index: MediaIndex, item: BlockMediaRecord): string {
  return item.altText ?? index.get(item.mediaId)?.altText ?? "";
}

export function onlyMedia(block: ParsedBlock, where: string): BlockMediaRecord {
  if (block.media.length !== 1) fail(where, `a ${block.data.type} needs exactly one media item, found ${block.media.length}`);
  return block.media[0];
}

// ---- Text ----

function plain(paragraph: Paragraph, where: string): string {
  if (!paragraph.every((run) => typeof run === "string")) fail(where, "formatted text cannot be rendered here");
  return paragraph.join("");
}

export function richText(block: ParsedBlock, role: string, paragraphs: number, where: string): Paragraph[] {
  const { data } = block;
  if (data.type !== "TEXT" || data.content.kind !== "richText") fail(where, "expected a rich-text TEXT block");
  if (data.config.role !== role) fail(where, `expected the "${role}" text role, found "${data.config.role ?? "none"}"`);
  if (data.content.paragraphs.length !== paragraphs) {
    fail(where, `the "${role}" role takes ${paragraphs} paragraph(s), found ${data.content.paragraphs.length}`);
  }
  return data.content.paragraphs;
}

// ---- Art Works ----

export function worksCover(project: PublicProjectRecord, index: MediaIndex): WorksCover {
  const where = `project ${project.slug}`;
  if (!project.coverMediaId) fail(where, "a public project needs a cover");
  const { src, width, height } = image(index, project.coverMediaId, "", where);
  return { src, width, height };
}

export function worksProject(project: PublicProjectRecord, index: MediaIndex): WorksProject {
  const where = `project ${project.slug}`;
  if (project.year === null) fail(where, "a public project needs a year");
  return {
    slug: project.slug,
    title: project.title,
    year: project.year,
    cover: worksCover(project, index),
    ...(project.previewMediaId ? { preview: videoSrc(index, project.previewMediaId, where) } : {}),
  };
}

// ---- Home ----

const HOME_SLOTS = ["hero", "identity", "wall", "about", "coda"] as const;

export function homeContent(tree: ParsedBlock[], index: MediaIndex, footer: HomeContent["footer"]): HomeContent {
  const where = "page HOME";
  if (tree.length !== HOME_SLOTS.length) {
    fail(where, `the Home template has ${HOME_SLOTS.length} blocks, found ${tree.length}`);
  }
  const [heroBlock, identityBlock, wallBlock, aboutBlock, codaBlock] = tree;
  const at = (block: ParsedBlock) => `${where}, block ${block.id}`;

  // Hero: a standalone ambient video over its poster, with a caption.
  const hero = heroBlock.data;
  if (hero.type !== "HERO" || hero.config.playback?.mode !== "AUTOPLAY_AMBIENT" || hero.config.overlay?.enabled) {
    fail(at(heroBlock), "the Home hero is an AUTOPLAY_AMBIENT HERO without a title overlay");
  }
  if (!hero.content.caption) fail(at(heroBlock), "the Home hero needs its caption");
  const heroItem = onlyMedia(heroBlock, at(heroBlock));

  // Identity: display, lead and aside, in that order.
  const identity = identityBlock.data;
  if (identity.type !== "GRID" || identity.config.preset !== "homeIdentity" || identityBlock.children.length !== 3) {
    fail(at(identityBlock), "homeIdentity holds the display, lead and aside texts");
  }
  const [display, lead, aside] = identityBlock.children.map((child, i) =>
    plain(richText(child, ["display", "lead", "aside"][i], 1, at(identityBlock))[0], at(identityBlock)),
  );

  // Wall: a VIDEO_GRID of posters, some of them moving.
  const wall = wallBlock.data;
  if (
    wall.type !== "GALLERY" ||
    wall.config.mode !== "VIDEO_GRID" ||
    wall.config.preset !== "homeWall" ||
    wall.config.playback.mode !== "AUTOPLAY_VISIBLE"
  ) {
    fail(at(wallBlock), "the Home wall is an AUTOPLAY_VISIBLE VIDEO_GRID with the homeWall preset");
  }
  if (!wall.content.label) fail(at(wallBlock), "the Home wall needs its label");
  const items: WallItem[] = wallBlock.media.map((item) => {
    const asset = liveMedia(index, item.mediaId, at(wallBlock));
    const alt = altFor(index, item);
    return asset.type === "VIDEO"
      ? { poster: poster(index, item, alt, at(wallBlock)), video: videoSrc(index, asset.id, at(wallBlock)) }
      : { poster: image(index, asset.id, alt, at(wallBlock)) };
  });

  // About: the text, the link line and the portrait.
  const about = aboutBlock.data;
  const [bodyText, moreText, portraitBlock, ...extra] = aboutBlock.children;
  if (about.type !== "GRID" || about.config.preset !== "homeAbout" || !portraitBlock || extra.length) {
    fail(at(aboutBlock), "homeAbout holds the body text, the link line and the portrait");
  }
  const body = plain(richText(bodyText, "body", 1, at(aboutBlock))[0], at(aboutBlock));
  const [moreParagraph] = richText(moreText, "more", 1, at(aboutBlock));
  const link = moreParagraph.length === 1 ? moreParagraph[0] : null;
  if (!link || typeof link === "string" || !("link" in link)) fail(at(aboutBlock), "the link line is a single link");
  if (portraitBlock.data.type !== "IMAGE") fail(at(aboutBlock), "homeAbout ends with the portrait IMAGE");
  const portraitItem = onlyMedia(portraitBlock, at(aboutBlock));

  // Coda: justified rows of stills.
  const coda = codaBlock.data;
  if (coda.type !== "GALLERY" || coda.config.mode !== "JUSTIFIED_ROWS") {
    fail(at(codaBlock), "the Home coda is a JUSTIFIED_ROWS gallery");
  }
  if (!coda.content.label) fail(at(codaBlock), "the Home coda needs its label");

  return {
    hero: {
      poster: poster(index, heroItem, altFor(index, heroItem), at(heroBlock)),
      video: videoSrc(index, heroItem.mediaId, at(heroBlock)),
      caption: hero.content.caption,
    },
    identity: { display, lead, aside },
    wall: { label: wall.content.label, items },
    about: {
      text: body,
      more: { href: link.link.href, label: link.link.text },
      portrait: image(index, portraitItem.mediaId, altFor(index, portraitItem), at(aboutBlock)),
    },
    coda: {
      label: coda.content.label,
      items: codaBlock.media.map((item) => image(index, item.mediaId, altFor(index, item), at(codaBlock))),
    },
    footer,
  };
}
