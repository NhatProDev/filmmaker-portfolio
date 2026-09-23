// Home is composer-driven (ADR-0007): in V1 its blocks will be page-owned rows
// read through the composer. That schema and its routes are specified but not
// applied yet, so until they exist this file carries the default composition
// of the approved prototype, block by block, in its authored order.
//
// Every string below is reproduced verbatim from
// docs/design/prototypes/home/Home Baseline v2 Responsive.dc.html. It is the
// prototype's provisional copy, not final publication copy. The email address
// is prototype copy that docs/design/prototypes/contact/MEDIA.md records as
// invented.
//
// Media are local-only copies of media/w/ and media/clips/ under
// public/media/home/, which is gitignored like /media/ itself. A fresh clone
// must restore them by hand. Image dimensions are the files' own, so every
// aspect ratio below is native.

export type HomeImage = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

export type WallItem = {
  poster: HomeImage;
  video?: string;
};

const image = (file: string, width: number, height: number, alt = ""): HomeImage => ({
  src: `/media/home/${file}`,
  width,
  height,
  alt,
});

const clip = (file: string) => `/media/home/${file}`;

export const home = {
  // Block 1 — HERO / VIDEO, AUTOPLAY_AMBIENT, full bleed.
  hero: {
    poster: image("mtm-atelier.jpg", 1800, 882),
    video: clip("n1.mp4"),
    caption: "Studio, 2026",
  },
  // Block 2 — GRID: display type 1–12, TEXT 1–5, TEXT 9–12.
  identity: {
    display: "Portfolio",
    lead: "Cinematographer and photographer in Hanoi. I shoot, light and grade: full stage, from the first frame to the final pass.",
    aside: "Commercial films, documentary work and stills. Sound stays off until you open a project.",
  },
  // Block 3 — GALLERY VIDEO_GRID, AUTOPLAY_VISIBLE. Five moving cells, four
  // still rest points, in source order.
  wall: {
    label: "Everything moving, this year",
    items: [
      { poster: image("desk-01.jpg", 1000, 563), video: clip("n2.mp4") },
      { poster: image("mtm-swatches.jpg", 1000, 490) },
      { poster: image("desk-03.jpg", 1200, 675), video: clip("c2.mp4") },
      { poster: image("mtm-table.jpg", 1400, 700), video: clip("n3.mp4") },
      { poster: image("nike-lacing.jpg", 1200, 675) },
      { poster: image("nike-court.jpg", 1000, 498), video: clip("c3.mp4") },
      { poster: image("desk-04.jpg", 1000, 563) },
      { poster: image("mtm-atelier.jpg", 1800, 882), video: clip("n4.mp4") },
      { poster: image("mtm-sketch.jpg", 1000, 490) },
    ] satisfies WallItem[],
  },
  // Block 4 — GRID: TEXT 1–6 + IMAGE 10–12, aligned to the end.
  about: {
    text: "I work small and close: one camera, available light where it serves the frame, and a grade that keeps the dark parts dark. Most of what is here was shot in Hanoi, some of it in Japan, all of it in the last three years.",
    more: { href: "/about", label: "More about the work" },
    portrait: image("portrait.jpg", 970, 1505, "Portrait of the filmmaker"),
  },
  // Block 5 — GALLERY JUSTIFIED_ROWS, native aspect, full bleed.
  coda: {
    label: "Frames, not films",
    items: [
      image("desk-02.jpg", 1000, 563),
      image("desk-05.jpg", 1000, 563),
      image("mtm-shopfront.jpg", 1000, 497),
      image("mtm-mannequin.jpg", 1000, 490),
    ],
  },
  // Site chrome, not a block (page-specifications.md §1.4).
  footer: {
    email: "hello@khanhnhat.film",
    note: "Hanoi, Vietnam. Open to work through early 2027.",
    links: [
      { href: "/works", label: "Works" },
      { href: "/about", label: "About" },
    ],
  },
};
