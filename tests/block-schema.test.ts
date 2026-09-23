import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  BlockValidationError,
  parseBlock,
  parseBlockMediaConfig,
  type BlockContext,
} from "@/features/project-builder/block.schema";

const root: BlockContext = { owner: "project", parentType: null };
const inGrid: BlockContext = { owner: "project", parentType: "GRID" };
const page: BlockContext = { owner: "page", parentType: null };

const rejects = (input: unknown, context: BlockContext, pattern: RegExp) =>
  assert.throws(() => parseBlock(input, context), (error: unknown) => {
    assert.ok(error instanceof BlockValidationError);
    assert.match(error.message, pattern);
    return true;
  });

describe("block contract: valid blocks of every type", () => {
  test("HERO with the bounded overlay on a project", () => {
    parseBlock(
      {
        type: "HERO",
        content: {},
        config: {
          playback: { mode: "CLICK_TO_PLAY" },
          fit: "COVER",
          overlay: { enabled: true, anchor: "bottom-start", colStart: 1, colSpan: 8, showBackToWorks: true },
        },
      },
      root,
    );
  });
  test("TEXT rich text with emphasis and a link", () => {
    parseBlock(
      {
        type: "TEXT",
        content: { kind: "richText", paragraphs: [["A ", { em: "tailor" }, " ", { link: { href: "/about", text: "more" } }]] },
        config: { role: "body", placement: { desktop: { colStart: 1, colSpan: 6 }, mobile: { colStart: 1, colSpan: 12 } } },
      },
      root,
    );
  });
  test("IMAGE, VIDEO, GRID, GALLERY and SPACER", () => {
    parseBlock({ type: "IMAGE", content: { caption: "Still" }, config: { fit: "COVER", preset: "projectCoda" } }, root);
    parseBlock({ type: "VIDEO", content: {}, config: { playback: { mode: "AUTOPLAY_VISIBLE" } } }, inGrid);
    parseBlock({ type: "GRID", content: {}, config: { preset: "projectStills" } }, root);
    parseBlock(
      {
        type: "GALLERY",
        content: { label: "Everything moving" },
        config: { mode: "VIDEO_GRID", columns: { desktop: 3, tablet: 2, mobile: 2 }, playback: { mode: "AUTOPLAY_VISIBLE" } },
      },
      page,
    );
    parseBlock({ type: "SPACER", content: {}, config: { size: "M" } }, root);
  });
});

describe("block contract: rejected input", () => {
  test("arbitrary JSON and unknown block types", () => {
    rejects({ type: "EMBED", content: {}, config: {} }, root, /type/);
    rejects({ type: "TEXT", content: { html: "<b>x</b>" }, config: {} }, root, /kind/);
    rejects({ type: "GRID", content: { anything: 1 }, config: {} }, root, /content/);
  });
  test("colour and typeface values in config (CLAUDE.md §13)", () => {
    rejects({ type: "TEXT", content: { kind: "projectFacts" }, config: { color: "#c4361c" } }, root, /color/);
    rejects({ type: "GRID", content: {}, config: { fontFamily: "Marcellus" } }, root, /fontFamily/);
  });
  test("12-column bounds and the closed breakpoint set (ADR-0006)", () => {
    rejects(
      { type: "IMAGE", content: {}, config: { placement: { desktop: { colStart: 8, colSpan: 6 } } } },
      inGrid,
      /13/,
    );
    rejects({ type: "IMAGE", content: {}, config: { placement: { desktop: { colStart: 0, colSpan: 6 } } } }, inGrid, /colStart/);
    rejects(
      { type: "IMAGE", content: {}, config: { placement: { desktop: { colStart: 1, colSpan: 6 }, wide: { colStart: 1, colSpan: 6 } } } },
      inGrid,
      /wide/,
    );
  });
  test("nesting: a GRID cannot hold a GRID or a GALLERY (ADR-0006)", () => {
    rejects({ type: "GRID", content: {}, config: {} }, inGrid, /cannot be nested/);
    rejects({ type: "GALLERY", content: {}, config: { mode: "JUSTIFIED_ROWS" } }, inGrid, /cannot be nested/);
    rejects({ type: "TEXT", content: { kind: "projectFacts" }, config: {} }, { owner: "project", parentType: "IMAGE" }, /cannot contain/);
  });
  test("derived playback flags are rejected, not ignored (ADR-0008)", () => {
    for (const flag of ["autoplay", "muted", "playsInline", "pauseWhenOffscreen"]) {
      rejects({ type: "VIDEO", content: {}, config: { playback: { mode: "AUTOPLAY_VISIBLE", [flag]: true } } }, root, new RegExp(flag));
    }
  });
  test("controls only with CLICK_TO_PLAY (ADR-0008)", () => {
    rejects({ type: "VIDEO", content: {}, config: { playback: { mode: "AUTOPLAY_VISIBLE", controls: true } } }, root, /controls/);
    parseBlock({ type: "VIDEO", content: {}, config: { playback: { mode: "CLICK_TO_PLAY", controls: true } } }, root);
  });
  test("AUTOPLAY_AMBIENT only on a standalone surface (ADR-0008)", () => {
    parseBlock({ type: "VIDEO", content: {}, config: { playback: { mode: "AUTOPLAY_AMBIENT" } } }, root);
    rejects({ type: "VIDEO", content: {}, config: { playback: { mode: "AUTOPLAY_AMBIENT" } } }, inGrid, /AUTOPLAY_AMBIENT/);
    rejects(
      {
        type: "GALLERY",
        content: {},
        config: { mode: "VIDEO_GRID", columns: { desktop: 3, tablet: 2, mobile: 1 }, playback: { mode: "AUTOPLAY_AMBIENT" } },
      },
      page,
      /playback/,
    );
    assert.throws(
      () => parseBlockMediaConfig({ playback: { mode: "AUTOPLAY_AMBIENT" } }, { blockType: "GALLERY", parentType: null }),
      /multi-item/,
    );
  });
  test("VIDEO_GRID column counts are bounded and fall at narrower breakpoints", () => {
    const wall = (columns: unknown) => ({
      type: "GALLERY",
      content: {},
      config: { mode: "VIDEO_GRID", columns, playback: { mode: "AUTOPLAY_VISIBLE" } },
    });
    rejects(wall({ desktop: 9, tablet: 2, mobile: 1 }), page, /desktop/);
    rejects(wall({ desktop: 2, tablet: 3, mobile: 1 }), page, /narrower/);
  });
  test("the HERO overlay authors no text and needs a project and CLICK_TO_PLAY (ADR-0010)", () => {
    const overlay = { enabled: true, anchor: "bottom-start", colStart: 1, colSpan: 8, showBackToWorks: true };
    rejects({ type: "HERO", content: {}, config: { overlay: { ...overlay, title: "Made to Measure" } } }, root, /title/);
    rejects({ type: "HERO", content: { title: "Made to Measure" }, config: {} }, root, /title/);
    rejects({ type: "HERO", content: {}, config: { overlay: { ...overlay, zIndex: 3 } } }, root, /zIndex/);
    rejects({ type: "HERO", content: {}, config: { overlay } }, page, /project-owned/);
    rejects({ type: "HERO", content: {}, config: { overlay, playback: { mode: "AUTOPLAY_VISIBLE" } } }, root, /CLICK_TO_PLAY/);
    rejects({ type: "HERO", content: {}, config: { overlay: { ...overlay, anchor: "top-left" } } }, root, /anchor/);
  });
  test("derived text needs a project owner (ADR-0011)", () => {
    rejects({ type: "TEXT", content: { kind: "projectCredits" }, config: {} }, page, /project owner/);
  });
  test("links are site paths, https URLs or mailto addresses only", () => {
    rejects(
      { type: "TEXT", content: { kind: "richText", paragraphs: [[{ link: { href: "javascript:alert(1)", text: "x" } }]] }, config: {} },
      root,
      /href/,
    );
  });
});
