import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "@db/client";
import { albums as albumsTable, projects, type Page as PageRow } from "@db/schema";
import { site as committedSite } from "@/content/site";
import { createAlbumRepository } from "@/features/albums/album.repository";
import { buildAlbumSnapshot } from "@/features/albums/album.snapshot";
import { buildContentPageSnapshot } from "@/features/page-content/page-content.snapshot";
import { buildPageSnapshot } from "@/features/project-builder/page-publication.service";
import { findPage } from "@/features/project-builder/page.service";
import { createPublicationRepository, type PublishedProject } from "@/features/project-builder/publication.repository";
import { buildProjectSnapshot } from "@/features/projects/publication.service";
import { ContentProjectionError, createMediaIndex, worksProject, type MediaIndex } from "./db-projection";
import { albumsIndex, parseAlbumSnapshot, renderAlbum } from "./album-projection";
import { parseContentPageSnapshot, renderAbout, renderContact, renderSite } from "./page-content-projection";
import type {
  AboutContent,
  AlbumPage,
  ContactContent,
  ContentGateway,
  HomeContent,
  Preview,
  ProjectPage,
  SiteSettings,
} from "./site-content.types";
import {
  parsePageSnapshot,
  privateProjectMediaUrl,
  parseProjectSnapshot,
  projectRecord,
  renderHome,
  renderProject,
  type ProjectSnapshot,
} from "./snapshot-projection";
import { staticGateway } from "./static-gateway";

// Serves public content from PostgreSQL, in the same view models as the static
// adapter. The public site reads only published snapshots (ADR-0012); the live
// project row contributes routing and access (slug, visibility, order).
// Errors propagate: a failing database or a snapshot the locked pages cannot
// render fails the request or the build rather than serving something
// different. About, Contact and the site settings are structured pages
// (ADR-0017): each shows its committed content until its first publish, and
// the settings fill in what the pages share (Home's footer, the email).

type Listed = PublishedProject & { parsed: ProjectSnapshot };

export function createDbGateway(db: Database): ContentGateway {
  const publications = createPublicationRepository(db);

  async function publicList(): Promise<Listed[]> {
    const rows = await publications.listPublicPublished();
    return rows.map((row) => ({ ...row, parsed: parseProjectSnapshot(row.snapshot, `project ${row.project.slug}`) }));
  }

  function page(
    slug: string,
    snapshot: ProjectSnapshot,
    displayPosition: number,
    next: { slug: string; title: string },
    url?: MediaIndex["url"],
  ): ProjectPage {
    const { works, page: content } = renderProject(snapshot, slug, url);
    const { seoTitle, seoDescription, shortDescription } = snapshot.project;
    const description = seoDescription ?? shortDescription;
    const seo = {
      ...(seoTitle ? { title: seoTitle } : {}),
      ...(description ? { description } : {}),
    };
    return {
      slug,
      title: works.title,
      year: works.year,
      cover: works.cover,
      displayPosition,
      ...(Object.keys(seo).length ? { seo } : {}),
      ...content,
      next,
    };
  }

  // A project outside the listing links on to the first listed project.
  async function firstListed(fallback: { slug: string; title: string }) {
    const [first] = await publications.listPublicPublished();
    if (!first) return fallback;
    return { slug: first.project.slug, title: parseProjectSnapshot(first.snapshot, `project ${first.project.slug}`).project.title };
  }

  // What the public sees of a structured page: its published snapshot, or
  // null before its first publish. In preview: its working copy, once it has
  // any content — until then the page previews as it is published.
  async function structured(key: "ABOUT" | "CONTACT" | "SITE", draft: boolean) {
    const row: PageRow = await findPage(db, key);
    if (draft && Object.keys(row.content as object).length) return buildContentPageSnapshot(db, row);
    const stored = await publications.findPage(row.id);
    return stored ? parseContentPageSnapshot(stored.snapshot, key) : null;
  }

  async function site(draft = false): Promise<SiteSettings> {
    const snapshot = await structured("SITE", draft);
    if (!snapshot) return committedSite;
    try {
      return renderSite(snapshot);
    } catch (error) {
      // A draft SITE that does not validate yet must not block previewing
      // the other pages; SITE's own publish panel names the problem.
      if (draft && error instanceof ContentProjectionError) return committedSite;
      throw error;
    }
  }

  async function home(snapshot: unknown, draft = false): Promise<HomeContent> {
    const { footer } = await staticGateway.getHome();
    const settings = await site(draft);
    return renderHome(parsePageSnapshot(snapshot, "page HOME"), { ...footer, email: settings.email, note: settings.footerNote });
  }

  async function about(draft = false): Promise<AboutContent> {
    const [snapshot, settings] = await Promise.all([structured("ABOUT", draft), site(draft)]);
    if (snapshot) return renderAbout(snapshot, settings);
    const committed = await staticGateway.getAbout();
    return { ...committed, contact: { ...committed.contact, email: settings.email } };
  }

  async function contact(draft = false): Promise<ContactContent> {
    const [snapshot, settings] = await Promise.all([structured("CONTACT", draft), site(draft)]);
    if (snapshot) return renderContact(snapshot, settings);
    const committed = await staticGateway.getContact();
    return {
      ...committed,
      email: { ...committed.email, address: settings.email },
      footer: { name: settings.name, role: settings.role, copyright: settings.copyright },
    };
  }

  // A published PUBLIC project an album belongs with, by the album's live
  // link; never a private one (ADR-0003, ADR-0019 §3).
  async function relatedProject(projectId: string | null): Promise<AlbumPage["related"]> {
    if (!projectId) return null;
    const row = (await publicList()).find((listed) => listed.project.id === projectId);
    return row ? { slug: row.project.slug, title: row.parsed.project.title } : null;
  }

  async function publishedAlbums(): Promise<AlbumPage[]> {
    const rows = await createAlbumRepository(db).listPublished();
    return Promise.all(
      rows.map(async ({ album, snapshot }) =>
        renderAlbum(parseAlbumSnapshot(snapshot, `album ${album.slug}`), album.slug, await relatedProject(album.projectId)),
      ),
    );
  }

  const preview = async <T,>(render: () => Promise<T | null>): Promise<Preview<T>> => {
    try {
      return { value: await render(), issue: null };
    } catch (error) {
      if (error instanceof ContentProjectionError) return { value: null, issue: error.message };
      throw error;
    }
  };

  return {
    async getWorksIndex() {
      const listed = await publicList();
      return {
        projects: listed.map(({ project, parsed }) =>
          worksProject(projectRecord(parsed, project.slug), createMediaIndex(parsed.media)),
        ),
      };
    },

    async listPublicProjectSlugs() {
      return (await publications.listPublicPublished()).map((row) => row.project.slug);
    },

    async getProjectPage(slug) {
      const listed = await publicList();
      const position = listed.findIndex((row) => row.project.slug === slug);
      if (position < 0) return null;
      const next = listed[(position + 1) % listed.length];
      return page(slug, listed[position].parsed, position, {
        slug: next.project.slug,
        title: next.parsed.project.title,
      });
    },

    async listProjectRoutes() {
      const rows = await publications.publishedSlugs();
      return {
        public: rows.filter((row) => row.visibility === "PUBLIC").map((row) => row.slug),
        private: rows.filter((row) => row.visibility === "PRIVATE").map((row) => row.slug),
      };
    },

    async findProjectRoute(slug) {
      const row = await publications.findPublishedBySlug(slug);
      if (!row) return null;
      return row.project.visibility === "PRIVATE" ? "private" : "public";
    },

    async findPrivateProject(slug) {
      const row = await publications.findPublishedBySlug(slug);
      return row && row.project.visibility === "PRIVATE" ? { projectId: row.project.id } : null;
    },

    async getPrivateProjectPage(slug, projectId) {
      const row = await publications.findPublishedBySlug(slug);
      if (!row || row.project.visibility !== "PRIVATE" || row.project.id !== projectId) return null;
      const snapshot = parseProjectSnapshot(row.snapshot, `project ${slug}`);
      const next = await firstListed({ slug, title: snapshot.project.title });
      return page(slug, snapshot, 0, next, privateProjectMediaUrl(slug));
    },

    async previewProjectPage(slug) {
      return preview(async () => {
        const [row] = await db
          .select()
          .from(projects)
          .where(and(eq(projects.slug, slug), isNull(projects.deletedAt)));
        if (!row) return null;
        const snapshot = await buildProjectSnapshot(db, row);
        const listed = await publicList();
        const position = listed.findIndex((item) => item.project.id === row.id);
        const next =
          position >= 0 && listed.length > 1
            ? listed[(position + 1) % listed.length]
            : listed.find((item) => item.project.id !== row.id);
        return page(
          slug,
          snapshot,
          Math.max(position, 0),
          next ? { slug: next.project.slug, title: next.parsed.project.title } : { slug, title: row.title },
        );
      });
    },

    // Until HOME is first published, the site shows its committed default.
    async getHome() {
      const homePage = await findPage(db, "HOME");
      const stored = await publications.findPage(homePage.id);
      return stored ? home(stored.snapshot) : staticGateway.getHome();
    },

    async previewHome() {
      return preview(async () => home(await buildPageSnapshot(db, await findPage(db, "HOME")), true));
    },

    async getAlbumsIndex() {
      return albumsIndex(await publishedAlbums());
    },

    async getAlbumPage(slug) {
      return (await publishedAlbums()).find((album) => album.slug === slug) ?? null;
    },

    async listPublicAlbumSlugs() {
      return (await createAlbumRepository(db).listPublished()).map((row) => row.album.slug);
    },

    async findAlbumRoute(slug) {
      return (await createAlbumRepository(db).listPublished()).some((row) => row.album.slug === slug);
    },

    // The working copy of any album that is not deleted, for an admin.
    async previewAlbumPage(slug) {
      return preview(async () => {
        const [row] = await db
          .select()
          .from(albumsTable)
          .where(and(eq(albumsTable.slug, slug), isNull(albumsTable.deletedAt)));
        if (!row) return null;
        return renderAlbum(await buildAlbumSnapshot(db, row), slug, await relatedProject(row.projectId));
      });
    },

    getAbout: () => about(),
    getContact: () => contact(),
    previewAbout: () => preview(() => about(true)),
    previewContact: () => preview(() => contact(true)),
  };
}
