import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type { Database } from "@db/client";
import { pagePublications, projectPublications, projects, publicationMedia, type Project as ProjectRow } from "@db/schema";

// Persistence of the single current snapshot per project and page (ADR-0012),
// with the relational list of media each snapshot references (for
// MEDIA_IN_USE). Replacing a snapshot replaces its media list in the same
// transaction as the caller's.

export type StoredPublication = { snapshot: unknown; publishedAt: Date };

export type PublishedProject = {
  project: Pick<ProjectRow, "id" | "slug" | "visibility" | "isFeatured" | "featuredPosition" | "displayPosition" | "passwordHash">;
  snapshot: unknown;
  publishedAt: Date;
};

const liveProjectColumns = {
  id: projects.id,
  slug: projects.slug,
  visibility: projects.visibility,
  isFeatured: projects.isFeatured,
  featuredPosition: projects.featuredPosition,
  displayPosition: projects.displayPosition,
  passwordHash: projects.passwordHash,
};

// Publicly readable: published, not deleted, and holding a snapshot.
const published = and(eq(projects.status, "PUBLISHED"), isNull(projects.deletedAt));

export function createPublicationRepository(db: Database) {
  return {
    async findProject(projectId: string): Promise<StoredPublication | null> {
      const [row] = await db
        .select({ snapshot: projectPublications.snapshot, publishedAt: projectPublications.publishedAt })
        .from(projectPublications)
        .where(eq(projectPublications.projectId, projectId));
      return row ?? null;
    },

    async publishedAtByProject(projectIds: readonly string[]): Promise<Map<string, Date>> {
      if (!projectIds.length) return new Map();
      const rows = await db
        .select({ projectId: projectPublications.projectId, publishedAt: projectPublications.publishedAt })
        .from(projectPublications)
        .where(inArray(projectPublications.projectId, [...projectIds]));
      return new Map(rows.map((row) => [row.projectId, row.publishedAt]));
    },

    async saveProject(projectId: string, snapshot: unknown, mediaIds: readonly string[], adminId: string | null) {
      await db
        .insert(projectPublications)
        .values({ projectId, snapshot, publishedBy: adminId })
        .onConflictDoUpdate({
          target: projectPublications.projectId,
          set: { snapshot, publishedAt: new Date(), publishedBy: adminId },
        });
      await db.delete(publicationMedia).where(eq(publicationMedia.projectId, projectId));
      if (mediaIds.length) {
        await db.insert(publicationMedia).values([...new Set(mediaIds)].map((mediaId) => ({ projectId, mediaId })));
      }
    },

    // Cascades to the snapshot's media list.
    async deleteProject(projectId: string): Promise<boolean> {
      const deleted = await db
        .delete(projectPublications)
        .where(eq(projectPublications.projectId, projectId))
        .returning({ projectId: projectPublications.projectId });
      return deleted.length > 0;
    },

    // The public listing (ADR-0003): PUBLIC only, in the live display order.
    async listPublicPublished(): Promise<PublishedProject[]> {
      const rows = await db
        .select({ project: liveProjectColumns, snapshot: projectPublications.snapshot, publishedAt: projectPublications.publishedAt })
        .from(projects)
        .innerJoin(projectPublications, eq(projectPublications.projectId, projects.id))
        .where(and(published, eq(projects.visibility, "PUBLIC")))
        .orderBy(asc(projects.displayPosition), asc(projects.id));
      return rows;
    },

    // A published project by slug, whatever its visibility. Callers decide
    // what a PRIVATE one may show.
    async findPublishedBySlug(slug: string): Promise<PublishedProject | null> {
      const [row] = await db
        .select({ project: liveProjectColumns, snapshot: projectPublications.snapshot, publishedAt: projectPublications.publishedAt })
        .from(projects)
        .innerJoin(projectPublications, eq(projectPublications.projectId, projects.id))
        .where(and(published, eq(projects.slug, slug)));
      return row ?? null;
    },

    // Every publicly routable project address, PUBLIC or PRIVATE.
    async publishedSlugs(): Promise<{ slug: string; visibility: ProjectRow["visibility"] }[]> {
      return db
        .select({ slug: projects.slug, visibility: projects.visibility })
        .from(projects)
        .innerJoin(projectPublications, eq(projectPublications.projectId, projects.id))
        .where(published);
    },

    async projectReferences(projectId: string, mediaId: string): Promise<boolean> {
      const [row] = await db
        .select({ id: publicationMedia.id })
        .from(publicationMedia)
        .where(and(eq(publicationMedia.projectId, projectId), eq(publicationMedia.mediaId, mediaId)));
      return Boolean(row);
    },

    // ---- Pages ----

    async findPage(pageId: string): Promise<StoredPublication | null> {
      const [row] = await db
        .select({ snapshot: pagePublications.snapshot, publishedAt: pagePublications.publishedAt })
        .from(pagePublications)
        .where(eq(pagePublications.pageId, pageId));
      return row ?? null;
    },

    async savePage(pageId: string, snapshot: unknown, mediaIds: readonly string[], adminId: string | null) {
      await db
        .insert(pagePublications)
        .values({ pageId, snapshot, publishedBy: adminId })
        .onConflictDoUpdate({
          target: pagePublications.pageId,
          set: { snapshot, publishedAt: new Date(), publishedBy: adminId },
        });
      await db.delete(publicationMedia).where(eq(publicationMedia.pageId, pageId));
      if (mediaIds.length) {
        await db.insert(publicationMedia).values([...new Set(mediaIds)].map((mediaId) => ({ pageId, mediaId })));
      }
    },
  };
}

export type PublicationRepository = ReturnType<typeof createPublicationRepository>;
