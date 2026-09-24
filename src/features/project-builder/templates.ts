import type { BlockType } from "./block.schema";

// Project templates (ADR-0013 §1): seed block trees copied into a new project
// when it is created. A template is not linked to the project afterwards —
// editing this file never changes an existing project, so templates never
// need a data migration.
//
// Seeds hold no media and no copy: every block a seed creates is either
// complete as it stands (the opening shows the cover until a film or image is
// chosen; facts and credits derive from Details) or created hidden, as
// scaffolding the author fills and then shows. A new project is therefore
// publishable as soon as it has its cover and year, and nothing placeholder
// ever reaches the site.

export const PROJECT_TEMPLATES = ["FILM_FIRST", "STILLS_FIRST", "EDITORIAL"] as const;
export type ProjectTemplate = (typeof PROJECT_TEMPLATES)[number];

export type SeedBlock = {
  type: BlockType;
  content?: Record<string, unknown>;
  config?: Record<string, unknown>;
  isHidden?: boolean;
  children?: SeedBlock[];
};

const OVERLAY = { enabled: true, anchor: "bottom-start", colStart: 1, colSpan: 8, showBackToWorks: true };
const col = (colStart: number, colSpan: number) => ({ placement: { desktop: { colStart, colSpan } } });

// The title-overlay HERO that opens every Project Detail page.
export const openingSeed = (film: boolean): SeedBlock => ({
  type: "HERO",
  config: film ? { playback: { mode: "CLICK_TO_PLAY" }, fit: "COVER", overlay: OVERLAY } : { fit: "COVER", overlay: OVERLAY },
});
const factsSeed: SeedBlock = {
  type: "GRID",
  config: { preset: "projectMeta" },
  children: [{ type: "TEXT", content: { kind: "projectFacts" }, config: col(1, 3) }],
};
const creditsSeed: SeedBlock = {
  type: "GRID",
  config: { preset: "projectCredits" },
  children: [{ type: "TEXT", content: { kind: "projectCredits" }, config: col(1, 3) }],
};

export const TEMPLATES: Record<ProjectTemplate, { label: string; description: string; blocks: SeedBlock[] }> = {
  FILM_FIRST: {
    label: "Film first",
    description: "Opens on the film. Facts, a stills row and a closing image (hidden until filled), credits.",
    blocks: [
      openingSeed(true),
      factsSeed,
      { type: "GRID", config: { preset: "projectStills" }, isHidden: true },
      creditsSeed,
      { type: "IMAGE", config: { fit: "COVER", preset: "projectCoda" }, isHidden: true },
    ],
  },
  STILLS_FIRST: {
    label: "Stills first",
    description: "Opens on a still. Facts, a gallery of stills in justified rows (hidden until filled), credits.",
    blocks: [openingSeed(false), factsSeed, { type: "GALLERY", config: { mode: "JUSTIFIED_ROWS" }, isHidden: true }, creditsSeed],
  },
  EDITORIAL: {
    label: "Editorial",
    description: "Opens on a still. Facts, an asymmetric two-image composition (hidden until filled), credits.",
    blocks: [
      openingSeed(false),
      factsSeed,
      {
        type: "GRID",
        isHidden: true,
        children: [
          { type: "IMAGE", config: { fit: "CONTAIN", ...col(1, 7) } },
          { type: "IMAGE", config: { fit: "CONTAIN", placement: { desktop: { colStart: 9, colSpan: 4 }, valign: "end" } } },
        ],
      },
      creditsSeed,
    ],
  },
};
