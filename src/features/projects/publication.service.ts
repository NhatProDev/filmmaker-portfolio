import { transaction, type Database } from "@db/client";
import { createPublicationRepository } from "@/features/project-builder/publication.repository";
import { readComposition, stableJson } from "@/features/project-builder/snapshot";
import {
  projectSnapshotSchema,
  renderIssues,
  renderProject,
  type ProjectSnapshot,
} from "@/features/site-content/snapshot-projection";
import { conflict, invalid, notFound } from "@/lib/errors/domain-error";
import type { PublicationDto } from "./project.mapper";
import { createProjectRepository, type ProjectRow } from "./project.repository";
import { projectCreditsSchema } from "./project.schema";

// Publishing a project (ADR-0012): the working copy is validated and written
// as the project's one current snapshot. The public site reads only that
// snapshot. Routing and access fields (slug, visibility, password, ordering)
// stay live on the project row and are never snapshotted.

export async function buildProjectSnapshot(db: Database, row: ProjectRow): Promise<ProjectSnapshot> {
  const composition = await readComposition(db, { kind: "project", id: row.id }, [row.coverMediaId, row.previewMediaId]);
  const credits = projectCreditsSchema.safeParse(row.credits);
  return {
    version: 1,
    project: {
      id: row.id,
      title: row.title,
      year: row.year,
      category: row.category,
      client: row.client,
      role: row.role,
      runtime: row.runtime,
      shortDescription: row.shortDescription,
      description: row.description,
      credits: credits.success ? credits.data : [],
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      coverMediaId: row.coverMediaId,
      previewMediaId: row.previewMediaId,
    },
    blocks: composition.blocks,
    media: composition.media,
  };
}

// Empty when the snapshot matches its schema and the locked Project Detail
// and Art Works templates render it exactly.
export function projectSnapshotIssues(snapshot: unknown, slug: string): string[] {
  const parsed = projectSnapshotSchema.safeParse(snapshot);
  if (!parsed.success) return parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  return renderIssues(() => renderProject(parsed.data, slug));
}

const projectNotFound = () => notFound("PROJECT_NOT_FOUND", "Project not found.");

export type ProjectPublicationOptions = {
  // Called after a change that alters what visitors see, e.g. to revalidate
  // the statically rendered public pages.
  onPublicChange?: () => void;
};

export function createProjectPublicationService(db: Database, options: ProjectPublicationOptions = {}) {
  return {
    async summary(tx: Database, row: ProjectRow): Promise<PublicationDto> {
      const stored = await createPublicationRepository(tx).findProject(row.id);
      const candidate = await buildProjectSnapshot(tx, row);
      return {
        isPublished: row.status === "PUBLISHED" && stored !== null,
        publishedAt: stored?.publishedAt.toISOString() ?? null,
        hasUnpublishedChanges: stored !== null && stableJson(candidate) !== stableJson(stored.snapshot),
        issues: projectSnapshotIssues(candidate, row.slug),
      };
    },

    publishedAt: (tx: Database, ids: readonly string[]) => createPublicationRepository(tx).publishedAtByProject(ids),

    // Writes the snapshot of the current working copy, or refuses with every
    // reason it cannot be rendered. Nothing is written on refusal.
    async publish(projectId: string, adminId: string | null) {
      await transaction(db, async (tx) => {
        const projects = createProjectRepository(tx);
        const row = await projects.findById(projectId, "update");
        if (!row) throw projectNotFound();
        const snapshot = await buildProjectSnapshot(tx, row);
        const issues = projectSnapshotIssues(snapshot, row.slug);
        if (issues.length) {
          throw invalid("PROJECT_NOT_PUBLISHABLE", "The project cannot be published yet.", {
            issues: issues.map((message) => ({ path: "", message })),
          });
        }
        await createPublicationRepository(tx).saveProject(row.id, snapshot, snapshot.media.map((m) => m.id), adminId);
        await projects.update(row.id, { status: "PUBLISHED", publishedAt: new Date() });
      });
      options.onPublicChange?.();
    },

    async unpublish(projectId: string) {
      await transaction(db, async (tx) => {
        const projects = createProjectRepository(tx);
        const row = await projects.findById(projectId, "update");
        if (!row) throw projectNotFound();
        const removed = await createPublicationRepository(tx).deleteProject(row.id);
        if (!removed && row.status !== "PUBLISHED") throw conflict("INVALID_STATE", "The project is not published.");
        await projects.update(row.id, { status: "DRAFT" });
      });
      options.onPublicChange?.();
    },

    async archive(projectId: string) {
      await transaction(db, async (tx) => {
        const projects = createProjectRepository(tx);
        const row = await projects.findById(projectId, "update");
        if (!row) throw projectNotFound();
        await createPublicationRepository(tx).deleteProject(row.id);
        await projects.update(row.id, { status: "ARCHIVED" });
      });
      options.onPublicChange?.();
    },

    // Inside the soft-delete transaction: the snapshot goes with the project.
    withdraw: async (tx: Database, projectId: string) => {
      await createPublicationRepository(tx).deleteProject(projectId);
    },
  };
}

export type ProjectPublicationService = ReturnType<typeof createProjectPublicationService>;
