import { transaction, type Database } from "@db/client";
import { createMediaRepository } from "@/features/media/media.repository";
import { createCompositionService } from "@/features/project-builder/composition.service";
import { hashPassword } from "@/lib/auth/password";
import { conflict, notFound, validationError } from "@/lib/errors/domain-error";
import { toProjectDetailDto, toProjectSummaryDto, type PublicationDto } from "./project.mapper";
import { createProjectRepository, type ProjectRow } from "./project.repository";

// Projects in the Studio (CLAUDE.md §6, §7, §11; ADR-0002, ADR-0011). The
// display and featured orders change only inside transactions that hold the
// ordering lock, and only the ordering endpoints rewrite them wholesale.

export type ProjectMetadataInput = {
  title?: string;
  slug?: string;
  shortDescription?: string | null;
  description?: string | null;
  year?: number | null;
  category?: string | null;
  client?: string | null;
  role?: string | null;
  runtime?: string | null;
  credits?: { role: string; name: string }[];
  visibility?: "PUBLIC" | "PRIVATE";
  coverMediaId?: string | null;
  previewMediaId?: string | null;
  isFeatured?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

// How a project's publication is summarised; replaced by the snapshot-aware
// summary of the publishing module (ADR-0012).
export type PublicationSummarizer = (db: Database, project: ProjectRow) => Promise<PublicationDto>;

const statusSummary: PublicationSummarizer = async (_db, project) => ({
  isPublished: project.status === "PUBLISHED",
  publishedAt: project.publishedAt?.toISOString() ?? null,
  hasUnpublishedChanges: false,
  issues: [],
});

const projectNotFound = () => notFound("PROJECT_NOT_FOUND", "Project not found.");

// A cover must be a ready image, a preview a ready video (ADR-0011). The row is
// share-locked so the asset cannot be deleted before the reference commits.
async function assertMediaFor(db: Database, id: string, type: "IMAGE" | "VIDEO", field: string) {
  const asset = await createMediaRepository(db).findById(id, "share");
  if (!asset || asset.type !== type || asset.status !== "READY") {
    throw validationError([{ path: field, message: `must be a ready ${type.toLowerCase()} from the Media Library` }]);
  }
}

export function createProjectService(db: Database, summarize: PublicationSummarizer = statusSummary) {
  async function detail(tx: Database, row: ProjectRow) {
    const media = createMediaRepository(tx);
    const [assets, blocks, publication] = await Promise.all([
      media.findRowsByIds([row.coverMediaId, row.previewMediaId].filter((id): id is string => Boolean(id))),
      createCompositionService(tx).tree({ kind: "project", id: row.id }),
      summarize(tx, row),
    ]);
    const byId = new Map(assets.map((asset) => [asset.id, asset]));
    return toProjectDetailDto(
      row,
      {
        cover: row.coverMediaId ? byId.get(row.coverMediaId) ?? null : null,
        preview: row.previewMediaId ? byId.get(row.previewMediaId) ?? null : null,
      },
      blocks,
      publication,
    );
  }

  async function checkReferences(tx: Database, input: ProjectMetadataInput, projectId?: string) {
    const projects = createProjectRepository(tx);
    if (input.slug && (await projects.slugTaken(input.slug, projectId))) {
      throw conflict("SLUG_TAKEN", "Another project already uses this slug.");
    }
    if (input.coverMediaId) await assertMediaFor(tx, input.coverMediaId, "IMAGE", "coverMediaId");
    if (input.previewMediaId) await assertMediaFor(tx, input.previewMediaId, "VIDEO", "previewMediaId");
  }

  return {
    async list(query: {
      status?: ProjectRow["status"];
      visibility?: ProjectRow["visibility"];
      search?: string;
      page: number;
      pageSize: number;
    }) {
      const { rows, total } = await createProjectRepository(db).list(query);
      const covers = await createMediaRepository(db).findRowsByIds(
        rows.flatMap((row) => (row.coverMediaId ? [row.coverMediaId] : [])),
      );
      const byId = new Map(covers.map((cover) => [cover.id, cover]));
      const summaries = await Promise.all(rows.map((row) => summarize(db, row)));
      return {
        data: rows.map((row, i) =>
          toProjectSummaryDto(
            row,
            row.coverMediaId ? byId.get(row.coverMediaId) ?? null : null,
            summaries[i].publishedAt ? new Date(summaries[i].publishedAt!) : null,
          ),
        ),
        meta: { page: query.page, pageSize: query.pageSize, total },
      };
    },

    async get(id: string) {
      const row = await createProjectRepository(db).findById(id);
      if (!row) throw projectNotFound();
      return detail(db, row);
    },

    // A new project is a DRAFT at the end of the display order.
    async create(input: ProjectMetadataInput & { title: string; slug: string; password?: string }) {
      return transaction(db, async (tx) => {
        const projects = createProjectRepository(tx);
        await projects.lockOrdering();
        await checkReferences(tx, input);
        const { password, isFeatured, ...fields } = input;
        const featured = isFeatured === true;
        const row = await projects.insert({
          ...fields,
          credits: fields.credits ?? [],
          status: "DRAFT",
          passwordHash: password ? await hashPassword(password) : null,
          displayPosition: await projects.countLive(),
          isFeatured: featured,
          featuredPosition: featured ? await projects.countFeatured() : null,
        });
        return detail(tx, row);
      });
    },

    async update(id: string, input: ProjectMetadataInput) {
      return transaction(db, async (tx) => {
        const projects = createProjectRepository(tx);
        await projects.lockOrdering();
        const row = await projects.findById(id, "update");
        if (!row) throw projectNotFound();
        await checkReferences(tx, input, id);
        if (input.visibility === "PRIVATE" && !row.passwordHash) {
          throw conflict("PROJECT_PASSWORD_REQUIRED", "Set a password before making the project private.");
        }
        const { isFeatured, ...fields } = input;
        const featuring =
          isFeatured === undefined || isFeatured === row.isFeatured
            ? {}
            : isFeatured
              ? { isFeatured: true, featuredPosition: await projects.countFeatured() }
              : { isFeatured: false, featuredPosition: null };
        const updated = await projects.update(id, { ...fields, ...featuring });
        if (isFeatured === false && row.isFeatured) await projects.compactOrders();
        return detail(tx, updated);
      });
    },

    // Soft delete: archived, out of both orders, and (ADR-0012) unpublished.
    async softDelete(id: string, onDeleted?: (tx: Database, project: ProjectRow) => Promise<void>) {
      await transaction(db, async (tx) => {
        const projects = createProjectRepository(tx);
        await projects.lockOrdering();
        const row = await projects.findById(id, "update");
        if (!row) throw projectNotFound();
        await projects.update(id, {
          deletedAt: new Date(),
          status: "ARCHIVED",
          isFeatured: false,
          featuredPosition: null,
        });
        await projects.compactOrders();
        await onDeleted?.(tx, row);
      });
    },

    async reorder(projectIds: string[]) {
      await transaction(db, async (tx) => {
        const projects = createProjectRepository(tx);
        await projects.lockOrdering();
        const current = await projects.liveIds();
        assertCompleteSet(current, projectIds, "every non-deleted project");
        await projects.setDisplayPositions(projectIds);
      });
    },

    async reorderFeatured(projectIds: string[]) {
      await transaction(db, async (tx) => {
        const projects = createProjectRepository(tx);
        await projects.lockOrdering();
        const current = await projects.featuredIds();
        assertCompleteSet(current, projectIds, "every featured project");
        await projects.setFeaturedPositions(projectIds);
      });
    },

    // Replacing the password invalidates every access granted with the old
    // one: access cookies are bound to the hash (CLAUDE.md §11).
    async setPassword(id: string, password: string) {
      const projects = createProjectRepository(db);
      if (!(await projects.findById(id))) throw projectNotFound();
      await projects.update(id, { passwordHash: await hashPassword(password) });
    },

    async removePassword(id: string) {
      await transaction(db, async (tx) => {
        const projects = createProjectRepository(tx);
        const row = await projects.findById(id, "update");
        if (!row) throw projectNotFound();
        if (row.visibility === "PRIVATE") {
          throw conflict("PROJECT_PASSWORD_REQUIRED", "A private project must keep a password.");
        }
        await projects.update(id, { passwordHash: null });
      });
    },
  };
}

function assertCompleteSet(current: string[], given: string[], what: string) {
  const known = new Set(current);
  if (current.length !== given.length || !given.every((id) => known.has(id))) {
    throw conflict("REORDER_SET_MISMATCH", `The order must list ${what} exactly once.`);
  }
}

export type ProjectService = ReturnType<typeof createProjectService>;
