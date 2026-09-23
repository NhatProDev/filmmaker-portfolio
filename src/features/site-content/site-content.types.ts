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
export interface ContentGateway {
  getHome(): Promise<HomeContent>;
  getWorksIndex(): Promise<WorksIndex>;
  // null when no public project has this slug.
  getProjectPage(slug: string): Promise<ProjectPage | null>;
  listPublicProjectSlugs(): Promise<string[]>;
  getAbout(): Promise<AboutContent>;
  getContact(): Promise<ContactContent>;
}
