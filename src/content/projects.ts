// Project Detail is composer-driven (page-specifications.md §3.2): in V1 a
// project's page is its blocks, read through GET /public/projects/{slug}
// (PublicProject). That API and the composer schema are not implemented yet, so
// this file stands in for the detail response, keyed by the Works slug. Project
// identity — slug, title, year, cover and displayPosition — is read from
// works.ts and never repeated here; the static content gateway joins the two
// (src/features/site-content/static-gateway.ts).
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

import type { ProjectDetail, ProjectImage } from "@/features/site-content/site-content.types";
import { mediaUrl } from "@/lib/storage/media-url";

const image = (slug: string, file: string, width: number, height: number, alt = ""): ProjectImage => ({
  src: mediaUrl(`projects/${slug}/${file}`),
  width,
  height,
  alt,
});

const media = (slug: string, file: string) => mediaUrl(`projects/${slug}/${file}`);

export const projectDetails: Record<string, ProjectDetail> = {
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
