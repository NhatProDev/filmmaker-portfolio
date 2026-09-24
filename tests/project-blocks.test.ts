import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { MediaRecord } from "@/features/media/media.repository";
import type { BlockMediaRecord, BlockRecord } from "@/features/project-builder/block.repository";
import { ContentProjectionError, createMediaIndex, parseTree } from "@/features/site-content/db-projection";
import { projectPageContent } from "@/features/site-content/project-blocks";
import type { ProjectBlock } from "@/features/site-content/site-content.types";
import { staticProjectContent } from "@/features/site-content/static-project-blocks";
import { projectDetails } from "@/content/projects";

// The generic Project Detail projection (Phase 3A): every block type, the
// presets' contracts, contextual alt, the poster chain, playback precedence,
// the opening rule, and refusal of what cannot be drawn.

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const media = (n: number, type: MediaRecord["type"], extra: Partial<MediaRecord> = {}): MediaRecord => ({
  id: uuid(n),
  type,
  status: "READY",
  storageProvider: "local",
  storageKey: `test/${n}.${type === "IMAGE" ? "jpg" : "mp4"}`,
  mimeType: type === "IMAGE" ? "image/jpeg" : "video/mp4",
  width: 1600,
  height: 900,
  durationMs: type === "IMAGE" ? null : 4000,
  altText: `asset ${n}`,
  posterMediaId: null,
  ...extra,
});

const COVER = media(1, "IMAGE");
const STILL = media(2, "IMAGE", { width: 1000, height: 500 });
const POSTER = media(3, "IMAGE");
const OTHER_POSTER = media(4, "IMAGE");
const FILM = media(5, "VIDEO", { posterMediaId: POSTER.id });
const BARE = media(6, "VIDEO");
const EXTERNAL = media(7, "EXTERNAL_VIDEO", { storageKey: null, externalProvider: "vimeo", externalUrl: "https://vimeo.com/76979871" });
const UNPLAYABLE = media(8, "EXTERNAL_VIDEO", { storageKey: null, externalProvider: "youtube", externalUrl: "https://www.youtube.com/playlist?list=PL1" });
const index = createMediaIndex([COVER, STILL, POSTER, OTHER_POSTER, FILM, BARE, EXTERNAL, UNPLAYABLE]);

let next = 100;
const place = (mediaId: string, extra: Partial<BlockMediaRecord> = {}): BlockMediaRecord => ({
  id: uuid(next++),
  mediaId,
  position: 0,
  altText: null,
  posterMediaId: null,
  config: {},
  ...extra,
});
const block = (type: BlockRecord["type"], content: object, config: object, extra: Partial<BlockRecord> = {}): BlockRecord => ({
  id: uuid(next++),
  type,
  position: 0,
  content,
  config,
  media: [],
  children: [],
  ...extra,
});

const OVERLAY = { enabled: true, anchor: "bottom-start", colStart: 1, colSpan: 8, showBackToWorks: true };
const opening = (items: BlockMediaRecord[] = [], playback = { mode: "CLICK_TO_PLAY" }) =>
  block("HERO", {}, { playback, fit: "COVER", overlay: OVERLAY }, { media: items });
const facts = () => block("TEXT", { kind: "projectFacts" }, {});
const meta = (...children: BlockRecord[]) => block("GRID", {}, { preset: "projectMeta" }, { children: [facts(), ...children] });

const project = {
  id: uuid(99),
  slug: "test-film",
  title: "Test Film",
  year: 2026,
  client: "A client",
  role: null,
  runtime: "4 min",
  credits: [{ role: "Director", name: "Someone" }],
  coverMediaId: COVER.id,
  previewMediaId: null,
};
const cover = { src: "/media/test/1.jpg", width: 1600, height: 900 };

const render = (blocks: BlockRecord[]) => projectPageContent(project, parseTree(blocks, "project", "project test-film"), index, cover);
const refuses = (blocks: BlockRecord[], pattern: RegExp) =>
  assert.throws(() => render(blocks), (error: unknown) => error instanceof ContentProjectionError && pattern.test(error.message));
const types = (blocks: ProjectBlock[]) => blocks.map((b) => b.type);

describe("the generic Project Detail projection", () => {
  test("no composition: the page shows its identity, the cover and the facts", () => {
    const page = render([]);
    assert.deepEqual(types(page.blocks), ["opening", "projectMeta"]);
    assert.deepEqual(page.facts, { year: 2026, runtime: "4 min", client: "A client" });
    assert.deepEqual(page.credits, [{ role: "Director", name: "Someone" }]);
    assert.deepEqual((page.blocks[0] as Extract<ProjectBlock, { type: "opening" }>).image, { ...cover, alt: "" });
  });

  test("the opening HERO: a film with its poster, an image, or the cover", () => {
    const film = render([opening([place(FILM.id, { altText: "The tailor's hands" })])]).blocks[0];
    assert.deepEqual(film, {
      type: "opening",
      id: film.id,
      image: { src: "/media/test/3.jpg", width: 1600, height: 900, alt: "The tailor's hands" },
      film: { src: "/media/test/5.mp4", width: 1600, height: 900 },
    });
    const still = render([opening([place(STILL.id)])]).blocks[0] as Extract<ProjectBlock, { type: "opening" }>;
    assert.equal(still.image.src, "/media/test/2.jpg");
    assert.equal(still.image.alt, "asset 2", "the asset's alt when the placement has none");
    assert.equal(still.film, undefined);
    const empty = render([opening()]).blocks[0] as Extract<ProjectBlock, { type: "opening" }>;
    assert.equal(empty.image.src, cover.src);
  });

  test("a composition without the opening HERO opens on the cover; the overlay HERO must come first", () => {
    const page = render([meta()]);
    assert.deepEqual(types(page.blocks), ["opening", "projectMeta"]);
    refuses([meta(), opening()], /comes first/);
    refuses([block("HERO", {}, { overlay: { ...OVERLAY, colSpan: 6 } })], /columns 1–8/);
    refuses([opening([place(FILM.id)], { mode: "AUTOPLAY_VISIBLE" })], /only with CLICK_TO_PLAY|CLICK_TO_PLAY/);
  });

  test("placement poster overrides the asset's; a film without any poster is refused at the opening", () => {
    const page = render([opening([place(FILM.id, { posterMediaId: OTHER_POSTER.id })])]);
    assert.equal((page.blocks[0] as Extract<ProjectBlock, { type: "opening" }>).image.src, "/media/test/4.jpg");
    refuses([opening([place(BARE.id)])], /has no poster/);
  });

  test("the presets keep their contracts", () => {
    const statement = block("TEXT", { kind: "richText", paragraphs: [["Lead ", { em: "line" }], ["Body"]] }, { role: "statement" });
    const stills = block("GRID", {}, { preset: "projectStills" }, {
      children: [block("IMAGE", {}, {}, { media: [place(STILL.id, { altText: "" })] })],
    });
    const loop = block("GRID", {}, { preset: "projectLoop" }, {
      children: [
        block("VIDEO", {}, { playback: { mode: "AUTOPLAY_VISIBLE" } }, { media: [place(FILM.id)] }),
        block("TEXT", { kind: "richText", paragraphs: [["The caption"]] }, { role: "caption" }),
      ],
    });
    const credits = block("GRID", {}, { preset: "projectCredits" }, { children: [block("TEXT", { kind: "projectCredits" }, {})] });
    const coda = block("IMAGE", {}, { preset: "projectCoda" }, { media: [place(STILL.id)] });
    const page = render([opening(), meta(statement), stills, loop, credits, coda]);
    assert.deepEqual(types(page.blocks), ["opening", "projectMeta", "projectStills", "projectLoop", "projectCredits", "projectCoda"]);
    const [, metaBlock, stillsBlock, loopBlock] = page.blocks as [ProjectBlock, Extract<ProjectBlock, { type: "projectMeta" }>, Extract<ProjectBlock, { type: "projectStills" }>, Extract<ProjectBlock, { type: "projectLoop" }>];
    assert.deepEqual(metaBlock.statement, { lead: ["Lead ", { em: "line" }], body: ["Body"] });
    assert.equal(stillsBlock.stills[0].alt, "", "a decorative placement stays decorative");
    assert.equal(loopBlock.poster.src, "/media/test/3.jpg");
    assert.deepEqual(loopBlock.caption, ["The caption"]);

    refuses([meta(block("TEXT", { kind: "richText", paragraphs: [["One"]] }, { role: "statement" }))], /2 paragraph/);
    refuses([block("GRID", {}, { preset: "projectStills" })], /no stills yet/);
    refuses([block("GRID", {}, { preset: "projectLoop" }, { children: [block("TEXT", { kind: "projectFacts" }, {})] })], /AUTOPLAY_VISIBLE VIDEO/);
    refuses([block("IMAGE", {}, { preset: "projectCoda" })], /no media yet/);
  });

  test("Home presets are refused on a project, when stored and when validated", () => {
    refuses([block("GRID", {}, { preset: "homeIdentity" })], /belongs to Home/);
  });

  test("generic blocks render by type, in stored order, with contextual alt", () => {
    const text = block("TEXT", { kind: "richText", paragraphs: [["Words ", { link: { href: "/works", text: "all works" } }]] }, { role: "body" });
    const image = block("IMAGE", { caption: "A caption" }, { fit: "CONTAIN" }, { media: [place(STILL.id, { altText: "Here, a shopfront" })] });
    const video = block("VIDEO", {}, { playback: { mode: "AUTOPLAY_VISIBLE" } }, { media: [place(BARE.id)] });
    const hero = block("HERO", { caption: "Second act" }, { fit: "COVER" }, { media: [place(FILM.id)] });
    const spacer = block("SPACER", {}, { size: "L" });
    const page = render([opening(), text, image, video, hero, spacer]);
    assert.deepEqual(types(page.blocks), ["opening", "text", "image", "video", "hero", "spacer"]);
    const [, t, i, v, h, s] = page.blocks;
    assert.deepEqual(t, { type: "text", id: text.id, role: "body", text: { kind: "richText", paragraphs: [["Words ", { link: { href: "/works", text: "all works" } }]] } });
    assert.deepEqual(i, { type: "image", id: image.id, image: { src: "/media/test/2.jpg", width: 1000, height: 500, alt: "Here, a shopfront" }, fit: "CONTAIN", caption: "A caption" });
    // No poster anywhere: the empty frame (ADR-0015's last step).
    assert.deepEqual((v as Extract<ProjectBlock, { type: "video" }>).video.poster, null);
    assert.equal((v as Extract<ProjectBlock, { type: "video" }>).video.playback, "AUTOPLAY_VISIBLE");
    // A standalone HERO defaults to CLICK_TO_PLAY: sound needs the visitor's act.
    assert.equal((h as Extract<ProjectBlock, { type: "hero" }>).media.kind, "video");
    assert.equal(((h as Extract<ProjectBlock, { type: "hero" }>).media as { video: { playback: string } }).video.playback, "CLICK_TO_PLAY");
    assert.deepEqual(s, { type: "spacer", id: spacer.id, size: "L" });
  });

  test("a GRID composes leaf children by logical placement; mobile placement is derived, not stored", () => {
    const grid = block("GRID", {}, {}, {
      children: [
        block("TEXT", { kind: "richText", paragraphs: [["Left"]] }, { role: "lead", placement: { desktop: { colStart: 1, colSpan: 5 } } }),
        block("IMAGE", {}, { placement: { desktop: { colStart: 7, colSpan: 6 }, tablet: { colStart: 5, colSpan: 8 }, valign: "end" } }, { media: [place(STILL.id)] }),
        block("VIDEO", {}, { playback: { mode: "CLICK_TO_PLAY" } }, { media: [place(FILM.id)] }),
        block("TEXT", { kind: "projectFacts" }, {}),
      ],
    });
    const [, rendered] = render([opening(), grid]).blocks as [ProjectBlock, Extract<ProjectBlock, { type: "grid" }>];
    assert.equal(rendered.type, "grid");
    assert.deepEqual(rendered.cells.map((c) => c.block.type), ["text", "image", "video", "text"]);
    assert.deepEqual(rendered.cells[0].placement, { desktop: { colStart: 1, colSpan: 5 } });
    assert.deepEqual(rendered.cells[1].placement, { desktop: { colStart: 7, colSpan: 6 }, tablet: { colStart: 5, colSpan: 8 }, valign: "end" });
    assert.equal(rendered.cells[2].placement, null);
    refuses([block("GRID", {}, {})], /no blocks yet/);
  });

  test("nesting beyond one level, and a GRID or GALLERY inside a GRID, are refused, not flattened", () => {
    refuses([block("GRID", {}, {}, { children: [block("GRID", {}, {})] })], /cannot be nested|leaf/);
    refuses([block("GRID", {}, {}, { children: [block("GALLERY", {}, { mode: "SLIDESHOW" })] })], /cannot be nested|leaf/);
    refuses([block("GRID", {}, {}, { children: [block("IMAGE", {}, { preset: "projectCoda" }, { media: [place(STILL.id)] })] })], /top level|full-width/);
  });

  test("GALLERY modes: images and video together where the mode can show them", () => {
    const wall = block("GALLERY", { label: "Loops" }, {
      mode: "VIDEO_GRID",
      columns: { desktop: 3, tablet: 2, mobile: 1 },
      playback: { mode: "AUTOPLAY_VISIBLE" },
    }, { media: [place(FILM.id), place(STILL.id), place(BARE.id, { config: { playback: { mode: "CLICK_TO_PLAY" } } })] });
    const [, g] = render([opening(), wall]).blocks as [ProjectBlock, Extract<ProjectBlock, { type: "gallery" }>];
    assert.deepEqual(g.layout, { mode: "VIDEO_GRID", columns: { desktop: 3, tablet: 2, mobile: 1 }, fit: "COVER" });
    assert.deepEqual(g.items.map((i) => i.kind), ["video", "image", "video"]);
    // Per-item override > block default > surface default (ADR-0008).
    assert.equal((g.items[0] as { video: { playback: string } }).video.playback, "AUTOPLAY_VISIBLE");
    assert.equal((g.items[2] as { video: { playback: string } }).video.playback, "CLICK_TO_PLAY");
    const strip = block("GALLERY", {}, { mode: "HORIZONTAL_STRIP" }, { media: [place(STILL.id), place(FILM.id)] });
    const [, s] = render([opening(), strip]).blocks as [ProjectBlock, Extract<ProjectBlock, { type: "gallery" }>];
    assert.equal((s.items[1] as { video: { playback: string } }).video.playback, "AUTOPLAY_VISIBLE", "multi-item surfaces default to AUTOPLAY_VISIBLE");
    refuses([block("GALLERY", {}, { mode: "JUSTIFIED_ROWS" }, { media: [place(FILM.id)] })], /JUSTIFIED_ROWS lays out stills/);
    refuses([block("GALLERY", {}, { mode: "SLIDESHOW" })], /no media yet/);
  });

  test("external video plays in the provider's player; an address it cannot show is refused (Phase 3B)", () => {
    const [, video] = render([block("VIDEO", {}, { playback: { mode: "CLICK_TO_PLAY" } }, { media: [place(EXTERNAL.id)] })]).blocks;
    assert.ok(video.type === "externalVideo");
    assert.equal(video.external.embedUrl, "https://player.vimeo.com/video/76979871?autoplay=1&dnt=1");
    refuses([block("VIDEO", {}, { playback: { mode: "CLICK_TO_PLAY" } }, { media: [place(UNPLAYABLE.id)] })], /not a YouTube or Vimeo/);
    refuses([block("VIDEO", {}, { playback: { mode: "AUTOPLAY_VISIBLE" } }, { media: [place(EXTERNAL.id)] })], /CLICK_TO_PLAY/);
  });

  test("malformed stored blocks are refused, never repaired", () => {
    refuses([block("TEXT", { kind: "richText", paragraphs: [["x"]] }, { color: "#ff0000" })], /color|Unrecognized/i);
    refuses([block("VIDEO", {}, { playback: { mode: "AUTOPLAY_VISIBLE", muted: true } }, { media: [place(FILM.id)] })], /muted|Unrecognized/i);
    refuses([block("GRID", {}, {}, { children: [block("TEXT", { kind: "richText", paragraphs: [["x"]] }, { placement: { desktop: { colStart: 8, colSpan: 6 } } })] })], /13/);
  });
});

describe("the committed content as blocks", () => {
  test("made-to-measure converts to the 1B composition, block for block", () => {
    const content = staticProjectContent(2026, cover, projectDetails["made-to-measure"]);
    assert.deepEqual(types(content.blocks), ["opening", "projectMeta", "projectStills", "projectLoop", "projectCredits", "projectCoda"]);
    assert.deepEqual(content.facts, { year: 2026, runtime: "8 min", client: "Trần & Sons", role: "DP, colourist" });
  });

  test("a project without detail content renders its identity", () => {
    assert.deepEqual(types(staticProjectContent(2025, cover, null).blocks), ["opening", "projectMeta"]);
  });
});
