// The public view models: exactly what the public pages render, and nothing
// about where it comes from. Every ContentGateway adapter returns these shapes.
//
// Media are referenced by URL with the file's own dimensions, so every aspect
// ratio is native. Alt text belongs to the placement, not the file: each use of
// an image carries its own, "" where the use is decorative.

// ---- Home ----

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

export type HomeContent = {
  hero: { poster: HomeImage; video: string; caption: string };
  identity: { display: string; lead: string; aside: string };
  wall: { label: string; items: WallItem[] };
  about: { text: string; more: { href: string; label: string }; portrait: HomeImage };
  coda: { label: string; items: HomeImage[] };
  footer: { email: string; note: string; links: { href: string; label: string }[] };
};

// ---- Art Works ----

export type WorksCover = {
  src: string;
  width: number;
  height: number;
};

export type WorksProject = {
  slug: string;
  title: string;
  year: number;
  cover: WorksCover;
  preview?: string;
};

// The public project list, in displayPosition order.
export type WorksIndex = {
  projects: WorksProject[];
};

// ---- Project Detail ----

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

// The committed Project Detail content (src/content/projects.ts), in the shape
// of the locked 1B page it was written from. The static adapter serves it as
// blocks (static-project-blocks.ts) and the import stores it as blocks.
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

// ---- Project Detail as blocks (Phase 3A) ----
//
// What the generic block renderer draws: the project's typed blocks, in
// order, with media resolved to URLs, alt text resolved per placement and
// posters resolved (ADR-0011, ADR-0015). Blocks that name a code-defined
// presentation preset (ADR-0013) arrive as that preset's own shape; every
// other block arrives as its type. Nothing here is CSS: placement is logical
// columns, sizes are closed names.

// Inline text: plain, emphasis, or a link. No HTML.
export type TextRun = string | { em: string } | { link: { href: string; text: string } };
export type TextParagraph = TextRun[];

export type TextRole = "display" | "lead" | "aside" | "body" | "statement" | "caption" | "more";
export type MediaFit = "COVER" | "CONTAIN";
export type PlaybackMode = "CLICK_TO_PLAY" | "AUTOPLAY_VISIBLE" | "AUTOPLAY_AMBIENT";

export type GridSpan = { colStart: number; colSpan: number };
export type GridAlign = "start" | "center" | "end" | "stretch";
// Desktop is authored; tablet derives from desktop and mobile stacks full
// width unless overridden (ADR-0006 §5).
export type GridPlacement = { desktop: GridSpan; tablet?: GridSpan; mobile?: GridSpan; align?: GridAlign; valign?: GridAlign };

export type ProjectVideo = {
  src: string;
  width: number | null;
  height: number | null;
  // Placement poster → asset poster; null draws the empty frame.
  poster: ProjectImage | null;
  playback: PlaybackMode;
};

export type ProjectMedia = { kind: "image"; image: ProjectImage } | { kind: "video"; video: ProjectVideo };

// Year always; runtime, client and role when the project has them.
export type ProjectFacts = { year: number; runtime?: string; client?: string; role?: string };

export type ProjectText =
  | { kind: "richText"; paragraphs: TextParagraph[] }
  // Derived from the project's own fields (ADR-0011).
  | { kind: "projectFacts" }
  | { kind: "projectCredits" };

// Blocks that may sit inside a GRID.
export type ProjectLeafBlock =
  | { type: "hero"; id: string; media: ProjectMedia; fit: MediaFit; caption: string | null }
  | { type: "text"; id: string; role: TextRole | null; text: ProjectText }
  | { type: "image"; id: string; image: ProjectImage; fit: MediaFit; caption: string | null }
  | { type: "video"; id: string; video: ProjectVideo; fit: MediaFit }
  | { type: "spacer"; id: string; size: "S" | "M" | "L" };

export type GalleryLayout =
  | { mode: "JUSTIFIED_ROWS" }
  | { mode: "HORIZONTAL_STRIP" }
  | { mode: "SLIDESHOW" }
  | { mode: "VIDEO_GRID"; columns: { desktop: number; tablet: number; mobile: number }; fit: MediaFit };

export type ProjectBlock =
  // The opening: the HERO that carries the title overlay (ADR-0010). Without
  // one the page opens on the project's cover.
  | { type: "opening"; id: string; image: ProjectImage; film?: { src: string; width: number; height: number } }
  // Presets (ADR-0013): the locked Project Detail derivations.
  | { type: "projectMeta"; id: string; statement: { lead: TextParagraph; body: TextParagraph } | null }
  | { type: "projectStills"; id: string; stills: ProjectImage[] }
  | { type: "projectLoop"; id: string; src: string; poster: ProjectImage; caption: TextParagraph }
  | { type: "projectCredits"; id: string }
  | { type: "projectCoda"; id: string; image: ProjectImage }
  // Every other block, by type.
  | ProjectLeafBlock
  | { type: "grid"; id: string; cells: { placement: GridPlacement | null; block: ProjectLeafBlock }[] }
  | { type: "gallery"; id: string; label: string | null; layout: GalleryLayout; items: ProjectMedia[] };

export type ProjectPage = {
  slug: string;
  title: string;
  year: number;
  cover: WorksCover;
  displayPosition: number;
  // Search and sharing text, from the project's SEO fields or its short
  // description; absent in the committed content.
  seo?: { title?: string; description?: string };
  facts: ProjectFacts;
  credits: ProjectCredit[];
  blocks: ProjectBlock[];
  // The next project in the public listing's displayPosition order, wrapping
  // after the last. Only listed projects can be next, so a PRIVATE project is
  // never named here (ADR-0003).
  next: { slug: string; title: string };
};

// ---- About ----

export type Inline = string | { em: string };

export type AboutImage = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

export type AboutContent = {
  marker: string;
  lead: string;
  portrait: { image: AboutImage; caption: string };
  biography: string[];
  evidence: { image: AboutImage; caption: string; answer: string };
  process: { line: string; image: AboutImage; caption: string };
  // A documented publication gap, kept as a designed placeholder.
  placeholder: { label: string; caption: string; line: string };
  experience: { heading: string; rows: { year: string; text: Inline[] }[] };
  contact: { availability: string; email: string };
};

// ---- Contact ----

export type ContactRow = {
  label: string;
  value: string;
  href?: string;
};

export type ContactIdentity = {
  image: { src: string; width: number; height: number; alt: string };
  caption: string;
};

export type ContactContent = {
  heading: string;
  statement: string;
  email: { label: string; address: string; reply: string };
  rows: ContactRow[];
  note: string;
  // Optional: the page is valid without it.
  identity: ContactIdentity | null;
  footer: { name: string; role: string; copyright: string };
};

// ---- The gateway ----

// The public read boundary. Public server components read content only through
// it: never from an adapter's source directly, and never over this
// application's own REST API, which is the contract for the Studio and external
// clients. Methods are asynchronous so that a future database adapter, reading
// through the application services, fits the same interface.
// A working copy rendered for an admin's preview: the page, or why the locked
// template cannot show it yet.
export type Preview<T> = { value: T | null; issue: string | null };

export interface ContentGateway {
  getHome(): Promise<HomeContent>;
  getWorksIndex(): Promise<WorksIndex>;
  // null when no public project has this slug.
  getProjectPage(slug: string): Promise<ProjectPage | null>;
  listPublicProjectSlugs(): Promise<string[]>;
  getAbout(): Promise<AboutContent>;
  getContact(): Promise<ContactContent>;

  // PRIVATE projects are never listed (ADR-0003). This says only that a slug
  // is a published private project, so the password gate can be shown; it
  // returns nothing of the project.
  findPrivateProject(slug: string): Promise<{ projectId: string } | null>;
  // The published page of a PRIVATE project, for a visitor whose access to
  // `projectId` the caller has verified. Its media resolve through the
  // access-checked route, never an unrestricted public URL.
  getPrivateProjectPage(slug: string, projectId: string): Promise<ProjectPage | null>;

  // Every published project address, by audience: what the edge proxy needs
  // to route /works/<slug> without rendering (src/proxy.ts).
  listProjectRoutes(): Promise<{ public: string[]; private: string[] }>;
  // The same for one slug, read fresh: how the proxy routes an address its
  // index does not know yet, e.g. a project published a moment ago.
  findProjectRoute(slug: string): Promise<"public" | "private" | null>;

  // The working copy, for an authenticated admin's preview (ADR-0012).
  previewProjectPage(slug: string): Promise<Preview<ProjectPage>>;
  previewHome(): Promise<Preview<HomeContent>>;
}
