import { transaction, type Database } from "@db/client";
import { createMediaRepository } from "@/features/media/media.repository";
import { createCompositionService } from "@/features/project-builder/composition.service";
import { createPublicationRepository } from "@/features/project-builder/publication.repository";
import { seedProjectTemplate } from "@/features/project-builder/template-seeding";
import type { ProjectTemplate } from "@/features/project-builder/templates";
import { hashPassword } from "@/lib/auth/password";
import { conflict, notFound, validationError } from "@/lib/errors/domain-error";
import { toProjectDetailDto, toProjectSummaryDto, type PublicationDto } from "./project.mapper";
import { createProjectRepository, type ProjectRow } from "./project.repository";
import { projectSnapshotIssues } from "./publication.service";

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

// How publication state is read and withdrawn: the snapshot publishing of
// ADR-0012 (publication.service.ts). Without it, status alone is reported.
export type PublicationProvider = {
  summary(db: Database, project: ProjectRow): Promise<PublicationDto>;
  publishedAt(db: Database, ids: readonly string[]): Promise<Map<string, Date>>;
  withdraw(db: Database, projectId: string): Promise<void>;
};

const statusOnly: PublicationProvider = {
  summary: async (_db, project) => ({
    isPublished: project.status === "PUBLISHED",
    publishedAt: project.publishedAt?.toISOString() ?? null,
    hasUnpublishedChanges: false,
    issues: [],
  }),
  publishedAt: async () => new Map(),
  withdraw: async () => {},
};

export type ProjectServiceOptions = {
  publication?: PublicationProvider;
  // Called after a change visitors can see: order, slug, visibility, deletion.
  onPublicChange?: () => void;
};

const projectNotFound = () => notFound("PROJECT_NOT_FOUND", "Project not found.");

// A cover must be a ready image, a preview a ready video (ADR-0011). The row is
// share-locked so the asset cannot be deleted before the reference commits.
async function assertMediaFor(db: Database, id: string, type: "IMAGE" | "VIDEO", field: string) {
  const asset = await createMediaRepository(db).findById(id, "share");
  if (!asset || asset.type !== type || asset.status !== "READY") {
    throw validationError([{ path: field, message: `must be a ready ${type.toLowerCase()} from the Media Library` }]);
  }
}

export function createProjectService(db: Database, options: ProjectServiceOptions = {}) {
  const publication = options.publication ?? statusOnly;
  const publicChange = () => options.onPublicChange?.();

  async function detail(tx: Database, row: ProjectRow) {
    const media = createMediaRepository(tx);
    const [assets, blocks, summary] = await Promise.all([
      media.findRowsByIds([row.coverMediaId, row.previewMediaId].filter((id): id is string => Boolean(id))),
      createCompositionService(tx).tree({ kind: "project", id: row.id }),
      publication.summary(tx, row),
    ]);
    const byId = new Map(assets.map((asset) => [asset.id, asset]));
    return toProjectDetailDto(
      row,
      {
        cover: row.coverMediaId ? byId.get(row.coverMediaId) ?? null : null,
        preview: row.previewMediaId ? byId.get(row.previewMediaId) ?? null : null,
      },
      blocks,
      summary,
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
      const publishedAt = await publication.publishedAt(db, rows.map((row) => row.id));
      return {
        data: rows.map((row) =>
          toProjectSummaryDto(
            row,
            row.coverMediaId ? byId.get(row.coverMediaId) ?? null : null,
            publishedAt.get(row.id) ?? null,
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
    async create(input: ProjectMetadataInput & { title: string; slug: string; password?: string; template?: ProjectTemplate }) {
      return transaction(db, async (tx) => {
        const projects = createProjectRepository(tx);
        await projects.lockOrdering();
        await checkReferences(tx, input);
        const { password, isFeatured, template, ...fields } = input;
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
        // Copied once, in the same transaction; never linked afterwards.
        if (template) await seedProjectTemplate(tx, row.id, template);
        return detail(tx, row);
      });
    },

    async update(id: string, input: ProjectMetadataInput) {
      let visible = false;
      const result = await transaction(db, async (tx) => {
        const projects = createProjectRepository(tx);
        await projects.lockOrdering();
        const row = await projects.findById(id, "update");
        if (!row) throw projectNotFound();
        await checkReferences(tx, input, id);
        if (input.visibility === "PRIVATE" && !row.passwordHash) {
          throw conflict("PROJECT_PASSWORD_REQUIRED", "Set a password before making the project private.");
        }
        // Visibility is live: a published snapshot must render publicly
        // before the project may become PUBLIC (ADR-0020).
        if (input.visibility === "PUBLIC" && row.visibility === "PRIVATE") {
          const stored = await createPublicationRepository(tx).findProject(id);
          const issues = stored ? projectSnapshotIssues(stored.snapshot, input.slug ?? row.slug, "PUBLIC") : [];
          if (issues.length) {
            throw conflict("PROJECT_NOT_PUBLIC_READY", "The published version uses private media. Replace them and publish before making the project public.", {
              issues: issues.map((message) => ({ path: "", message })),
            });
          }
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
        // Slug and visibility are live: a published project changes address or
        // audience at once, without a publish (ADR-0012).
        visible =
          row.status === "PUBLISHED" &&
          ((input.slug !== undefined && input.slug !== row.slug) ||
            (input.visibility !== undefined && input.visibility !== row.visibility));
        return detail(tx, updated);
      });
      if (visible) publicChange();
      return result;
    },

    // Soft delete: archived, out of both orders, and (ADR-0012) unpublished.
    async softDelete(id: string) {
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
        await publication.withdraw(tx, row.id);
      });
      publicChange();
    },

    async reorder(projectIds: string[]) {
      await transaction(db, async (tx) => {
        const projects = createProjectRepository(tx);
        await projects.lockOrdering();
        const current = await projects.liveIds();
        assertCompleteSet(current, projectIds, "every non-deleted project");
        await projects.setDisplayPositions(projectIds);
      });
      publicChange();
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
