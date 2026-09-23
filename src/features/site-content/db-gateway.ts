import type { Database } from "@db/client";
import { createMediaRepository, type MediaRecord } from "@/features/media/media.repository";
import { createBlockRepository } from "@/features/project-builder/block.repository";
import { createProjectRepository } from "@/features/projects/project.repository";
import {
  ContentProjectionError,
  homeContent,
  parseTree,
  projectDetail,
  treeMediaIds,
  worksCover,
  worksProject,
  type MediaIndex,
} from "./db-projection";
import type { ContentGateway } from "./site-content.types";
import { staticGateway } from "./static-gateway";

// Serves public content from PostgreSQL, in the same view models as the static
// adapter. Errors propagate: a failing database or a composition the locked
// pages cannot render fails the request or the build rather than serving
// something different. About, Contact and Home's footer stay static in V1
// (CLAUDE.md §19); they are site chrome and content files, not database rows.
export function createDbGateway(db: Database): ContentGateway {
  const projects = createProjectRepository(db);
  const blocks = createBlockRepository(db);
  const media = createMediaRepository(db);

  // Live assets by id, plus the posters those assets name.
  async function mediaIndex(ids: readonly (string | null)[]): Promise<MediaIndex> {
    const wanted = [...new Set(ids.filter((id): id is string => id !== null))];
    const assets = await media.findLiveByIds(wanted);
    const posterIds = assets.map((asset) => asset.posterMediaId).filter((id): id is string => id !== null);
    const posters = await media.findLiveByIds(posterIds.filter((id) => !wanted.includes(id)));
    return new Map<string, MediaRecord>([...assets, ...posters].map((asset) => [asset.id, asset]));
  }

  return {
    async getWorksIndex() {
      const rows = await projects.listPublic();
      const index = await mediaIndex(rows.flatMap((row) => [row.coverMediaId, row.previewMediaId]));
      return { projects: rows.map((row) => worksProject(row, index)) };
    },

    async listPublicProjectSlugs() {
      return (await projects.listPublic()).map((row) => row.slug);
    },

    async getProjectPage(slug) {
      const rows = await projects.listPublic();
      const position = rows.findIndex((row) => row.slug === slug);
      if (position < 0) return null;
      const project = rows[position];
      const next = rows[(position + 1) % rows.length];
      const records = await blocks.listVisibleTreeForProject(project.id);
      const tree = parseTree(records, "project", `project ${slug}`);
      const index = await mediaIndex([project.coverMediaId, ...treeMediaIds(records)]);
      if (project.year === null) throw new ContentProjectionError(`project ${slug}: a public project needs a year`);
      return {
        slug,
        title: project.title,
        year: project.year,
        cover: worksCover(project, index),
        // The position in the public listing, as Art Works numbers it.
        displayPosition: position,
        detail: projectDetail(project, tree, index),
        next: { slug: next.slug, title: next.title },
      };
    },

    async getHome() {
      const page = await blocks.findPageByKey("HOME");
      if (!page) throw new ContentProjectionError("page HOME: the row is missing; apply the database migrations");
      const records = await blocks.listVisibleTreeForPage(page.id);
      const tree = parseTree(records, "page", "page HOME");
      const index = await mediaIndex(treeMediaIds(records));
      const { footer } = await staticGateway.getHome();
      return homeContent(tree, index, footer);
    },

    getAbout: () => staticGateway.getAbout(),
    getContact: () => staticGateway.getContact(),
  };
}
