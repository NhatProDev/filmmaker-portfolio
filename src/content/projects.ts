// Project Detail is composer-driven (page-specifications.md §3.2): in V1 a
// project's page is its blocks, read through GET /public/projects/{slug}
// (PublicProject). That API and the composer schema are not implemented yet, so
// this file stands in for the detail response, keyed by the Works slug. Project
// identity — slug, title, year, cover and displayPosition — is read from
// works.ts and never repeated here.
//
// Only "made-to-measure" has detail content: it is the one project that
// docs/design/prototypes/project-detail/Project Detail 1B v2 Responsive.dc.html
// populates, and every string and asset below is reproduced from it, block by
// block, in its authored order. It is the prototype's provisional copy, not
// publication copy. The other Works projects have no detail content anywhere in
// the repository and none is invented: their pages render their identity only.
//
// Fields named as in PublicProject (client, credits) mirror the contract. The
// runtime and role rows have no contract field; they are the prototype's
// metadata copy. Image dimensions are the files' own, so every aspect ratio is
// native.
//
// Media are local-only copies of media/w/ and media/clips/ under
// public/media/projects/<slug>/, which is gitignored like /media/ itself. A
// fresh clone must restore them by hand.

import { works, type WorksCover } from "./works";

export type ProjectImage = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

// A CLICK_TO_PLAY film. Its poster is a property of the video asset
// (ADR-0009), not of the block.
export type ProjectFilm = {
  src: string;
  width: number;
  height: number;
  poster: ProjectImage;
};

export type ProjectCredit = {
  role: string;
  name: string;
};

export type ProjectDetail = {
  client?: string;
  runtime?: string;
  role?: string;
  credits: ProjectCredit[];
  // Block 1 — HERO / VIDEO, CLICK_TO_PLAY. Without a film the HERO is an IMAGE
  // HERO of the project's cover.
  film?: ProjectFilm;
  // Block 2 — GRID: metadata list + statement.
  statement?: { lead: string; body: string };
  // Block 3 — GRID of stills.
  stills: ProjectImage[];
  // Block 4 — GRID: AUTOPLAY_VISIBLE loop + caption.
  loop?: { src: string; poster: ProjectImage; caption: string };
  // Block 6 — IMAGE, full-bleed coda.
  coda?: ProjectImage;
};

export type ProjectPage = {
  slug: string;
  title: string;
  year: number;
  cover: WorksCover;
  displayPosition: number;
  detail: ProjectDetail | null;
  // The next project in the public listing's displayPosition order, wrapping
  // after the last. Only listed projects can be next, so a PRIVATE project is
  // never named here (ADR-0003).
  next: { slug: string; title: string };
};

const image = (slug: string, file: string, width: number, height: number, alt = ""): ProjectImage => ({
  src: `/media/projects/${slug}/${file}`,
  width,
  height,
  alt,
});

const media = (slug: string, file: string) => `/media/projects/${slug}/${file}`;

const details: Record<string, ProjectDetail> = {
  "made-to-measure": {
    client: "Trần & Sons",
    runtime: "8 min",
    role: "DP, colourist",
    credits: [
      { role: "Director", name: "Mai Linh" },
      { role: "Camera", name: "Nguyen Khanh Nhat" },
      { role: "Sound", name: "Pham Duy" },
      { role: "Edit", name: "Hoang Yen" },
    ],
    // The poster is the prototype's recorded hero still. Its responsive
    // default instead draws a frame of the film at run time, which MEDIA.md
    // keeps as validation evidence only.
    film: {
      src: media("made-to-measure", "c1.mp4"),
      width: 1280,
      height: 720,
      poster: image("made-to-measure", "mtm-table.jpg", 1400, 700),
    },
    statement: {
      lead: "A tailor measures the same customer for thirty years. We filmed the last fitting before the shop closed.",
      body: "Four mornings, one prime lens, and the window the shop has always used. Nothing was added to the room, and the grade holds the shadows where the room keeps them.",
    },
    stills: [
      image("made-to-measure", "mtm-sketch.jpg", 1000, 490),
      image("made-to-measure", "mtm-shopfront.jpg", 1000, 497),
      image("made-to-measure", "mtm-atelier.jpg", 1800, 882),
      image("made-to-measure", "mtm-swatches.jpg", 1000, 490),
    ],
    loop: {
      src: media("made-to-measure", "n3.mp4"),
      poster: image("made-to-measure", "mtm-mannequin.jpg", 1000, 490),
      caption: "The cutting room on the second morning. Two takes survived; this is the one where nobody looked up.",
    },
    coda: image("made-to-measure", "mtm-portrait.jpg", 1000, 499),
  },
};

export function projectSlugs(): string[] {
  return works.projects.map((project) => project.slug);
}

export function projectPage(slug: string): ProjectPage | undefined {
  const { projects } = works;
  const index = projects.findIndex((project) => project.slug === slug);
  if (index < 0) return undefined;
  const { title, year, cover } = projects[index];
  const next = projects[(index + 1) % projects.length];
  return {
    slug,
    title,
    year,
    cover,
    displayPosition: index,
    detail: details[slug] ?? null,
    next: { slug: next.slug, title: next.title },
  };
}
