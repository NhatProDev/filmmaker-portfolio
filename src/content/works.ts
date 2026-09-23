// Art Works is data-driven (page-specifications.md §2.2): in V1 it renders the
// public project list — PUBLISHED, not deleted, PUBLIC, ordered by
// displayPosition (ADR-0003, page-specifications.md §2.4). That API is not
// implemented yet, so this file stands in for GET /public/projects with the
// nine projects of docs/design/prototypes/art-works/Art Works 2C v2
// Responsive.dc.html, in the prototype's order. Array order is displayPosition.
//
// Titles, years, covers and clips are the prototype's provisional data, not
// publication content. Slugs are fixture values derived from the titles; the
// projects.slug column exists, but these values are not real records.
//
// Fields mirror PublicProjectSummary (slug, title, year) and Media (width,
// height), so the aspect ratio comes from the cover's own dimensions. The
// preview clip is fixture-only: whether a moving preview is an explicit
// per-project choice is an open data question (page-specifications.md §2.7),
// and here, as in the prototype, a project is eligible when it has one.
//
// Media are local-only copies of media/w/ and media/clips/ under
// public/media/works/, which is gitignored like /media/ itself. A fresh clone
// must restore them by hand.

import type { WorksCover, WorksProject } from "@/features/site-content/site-content.types";
import { mediaUrl } from "@/lib/storage/media-url";

const cover = (file: string, width: number, height: number): WorksCover => ({
  src: mediaUrl(`works/${file}`),
  width,
  height,
});

const clip = (file: string) => mediaUrl(`works/${file}`);

export const works = {
  projects: [
    { slug: "made-to-measure", title: "Made to Measure", year: 2026, cover: cover("mtm-atelier.jpg", 1800, 882), preview: clip("n3.mp4") },
    { slug: "court", title: "Court", year: 2026, cover: cover("nike-court.jpg", 1000, 498), preview: clip("c3.mp4") },
    { slug: "the-desk", title: "The Desk", year: 2025, cover: cover("desk-01.jpg", 1000, 563), preview: clip("n2.mp4") },
    { slug: "honey-slowly", title: "Honey, Slowly", year: 2025, cover: cover("desk-03.jpg", 1200, 675), preview: clip("n1.mp4") },
    { slug: "shopfront", title: "Shopfront", year: 2025, cover: cover("mtm-shopfront.jpg", 1000, 497) },
    { slug: "lacing", title: "Lacing", year: 2024, cover: cover("nike-lacing.jpg", 1200, 675), preview: clip("c2.mp4") },
    { slug: "sketch", title: "Sketch", year: 2024, cover: cover("mtm-sketch.jpg", 1000, 490) },
    { slug: "night-shift", title: "Night Shift", year: 2023, cover: cover("desk-04.jpg", 1000, 563), preview: clip("n4.mp4") },
    { slug: "sitting", title: "Sitting", year: 2023, cover: cover("portrait.jpg", 970, 1505) },
  ] satisfies WorksProject[],
};
