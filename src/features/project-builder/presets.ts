import { GALLERY_PRESETS, GRID_PRESETS, IMAGE_PRESETS } from "./block.schema";

// The presentation presets (ADR-0013 §2), described for the people and code
// that choose them: which block type each dresses, which page owns it, and
// what it holds. A preset's responsive behaviour lives in the renderer's CSS;
// the data only names it. Adding one is a code change with review.

export type PresetName = (typeof GRID_PRESETS)[number] | (typeof GALLERY_PRESETS)[number] | (typeof IMAGE_PRESETS)[number];

export type PresetDefinition = {
  name: PresetName;
  blockType: "GRID" | "GALLERY" | "IMAGE";
  owner: "project" | "page";
  label: string;
  description: string;
};

export const PRESETS: Record<PresetName, PresetDefinition> = {
  projectMeta: {
    name: "projectMeta",
    blockType: "GRID",
    owner: "project",
    label: "Facts and statement",
    description: "Year, runtime, client and role from Details, with an optional two-part statement beside them.",
  },
  projectStills: {
    name: "projectStills",
    blockType: "GRID",
    owner: "project",
    label: "Stills row",
    description: "Stills at their own proportions, edge to edge: four across, two on tablets, one on phones.",
  },
  projectLoop: {
    name: "projectLoop",
    blockType: "GRID",
    owner: "project",
    label: "Loop and caption",
    description: "A silent loop that plays while visible, with its caption beside it; the caption moves below on narrow screens.",
  },
  projectCredits: {
    name: "projectCredits",
    blockType: "GRID",
    owner: "project",
    label: "Credits",
    description: "The credit list from Details.",
  },
  projectCoda: {
    name: "projectCoda",
    blockType: "IMAGE",
    owner: "project",
    label: "Closing image",
    description: "One full-bleed closing image.",
  },
  homeIdentity: {
    name: "homeIdentity",
    blockType: "GRID",
    owner: "page",
    label: "Home identity",
    description: "Home's display line, lead and aside.",
  },
  homeAbout: {
    name: "homeAbout",
    blockType: "GRID",
    owner: "page",
    label: "Home about",
    description: "Home's about text, link line and portrait.",
  },
  homeWall: {
    name: "homeWall",
    blockType: "GALLERY",
    owner: "page",
    label: "Home wall",
    description: "Home's wall of moving posters.",
  },
};

export function presetFor(name: string): PresetDefinition | undefined {
  return (PRESETS as Record<string, PresetDefinition>)[name];
}
