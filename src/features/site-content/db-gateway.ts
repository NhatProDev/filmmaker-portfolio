import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "@db/client";
import { projects } from "@db/schema";
import { buildPageSnapshot } from "@/features/project-builder/page-publication.service";
import { findPage } from "@/features/project-builder/page.service";
import { createPublicationRepository, type PublishedProject } from "@/features/project-builder/publication.repository";
import { buildProjectSnapshot } from "@/features/projects/publication.service";
import { ContentProjectionError, createMediaIndex, worksProject, type MediaIndex } from "./db-projection";
import type { ContentGateway, HomeContent, Preview, ProjectPage } from "./site-content.types";
import {
  parsePageSnapshot,
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
// different. About, Contact and Home's footer stay static in V1 (CLAUDE.md
// §19); they are site chrome and content files, not database rows.

type Listed = PublishedProject & { parsed: ProjectSnapshot };

// PRIVATE media never resolve to an unrestricted public URL (ADR-0014 §4).
const privateMediaUrl =
  (slug: string): MediaIndex["url"] =>
  (asset) =>
    `/api/v1/public/projects/${slug}/media/${asset.id}`;

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

  async function home(snapshot: unknown): Promise<HomeContent> {
    const { footer } = await staticGateway.getHome();
    return renderHome(parsePageSnapshot(snapshot, "page HOME"), footer);
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
      return page(slug, snapshot, 0, next, privateMediaUrl(slug));
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
      return preview(async () => home(await buildPageSnapshot(db, await findPage(db, "HOME"))));
    },

    getAbout: () => staticGateway.getAbout(),
    getContact: () => staticGateway.getContact(),
  };
}
