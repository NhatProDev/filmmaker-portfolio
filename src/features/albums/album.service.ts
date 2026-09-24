import { and, eq, isNull } from "drizzle-orm";
import { transaction, type Database } from "@db/client";
import { projects } from "@db/schema";
import type { MediaDto } from "@/features/media/media.mapper";
import { createMediaRepository } from "@/features/media/media.repository";
import { createMediaService } from "@/features/media/media.service";
import { stableJson } from "@/features/project-builder/snapshot";
import type { PublicationDto } from "@/features/projects/project.mapper";
import { albumIssues } from "@/features/site-content/album-projection";
import { conflict, invalid, notFound, validationError } from "@/lib/errors/domain-error";
import { createAlbumRepository, type AlbumMediaRow, type AlbumRow } from "./album.repository";
import type { UpdateAlbum } from "./album.schema";
import { buildAlbumSnapshot } from "./album.snapshot";

// Albums (ADR-0019): business rules, ordering and publishing. The working
// copy is edited here; visitors see only the published snapshot (ADR-0012).

const albumNotFound = () => notFound("ALBUM_NOT_FOUND", "Album not found.");
const itemNotFound = () => notFound("ALBUM_MEDIA_NOT_FOUND", "Album image not found.");

export type AlbumServiceOptions = { onPublicChange?: () => void };

export function createAlbumService(db: Database, options: AlbumServiceOptions = {}) {
  const publicChange = () => options.onPublicChange?.();

  async function requireAlbum(tx: Database, id: string, lock?: "update") {
    const row = await createAlbumRepository(tx).findById(id, lock);
    if (!row) throw albumNotFound();
    return row;
  }

  // A cover or item: a live, READY image from the Media Library.
  async function requireImage(tx: Database, mediaId: string, path: string) {
    const asset = await createMediaRepository(tx).findById(mediaId, "share");
    if (!asset || asset.type !== "IMAGE" || asset.status !== "READY") {
      throw validationError([{ path, message: "must be a ready image from the Media Library" }]);
    }
    return asset;
  }

  async function requireProject(tx: Database, projectId: string) {
    const [row] = await tx.select({ id: projects.id }).from(projects).where(and(eq(projects.id, projectId), isNull(projects.deletedAt)));
    if (!row) throw validationError([{ path: "projectId", message: "must be an existing project" }]);
  }

  async function publication(tx: Database, row: AlbumRow): Promise<PublicationDto> {
    const stored = await createAlbumRepository(tx).findPublication(row.id);
    const candidate = await buildAlbumSnapshot(tx, row);
    return {
      isPublished: row.status === "PUBLISHED" && stored !== null,
      publishedAt: stored?.publishedAt.toISOString() ?? null,
      hasUnpublishedChanges: stored !== null && stableJson(candidate) !== stableJson(stored.snapshot),
      issues: albumIssues(candidate, row.slug),
    };
  }

  async function detail(tx: Database, row: AlbumRow) {
    const repo = createAlbumRepository(tx);
    const items = await repo.listItems(row.id);
    const media = await createMediaService(tx).dtosByIds([...items.map((item) => item.mediaId), ...(row.coverMediaId ? [row.coverMediaId] : [])]);
    const [project] = row.projectId
      ? await tx.select({ id: projects.id, title: projects.title, slug: projects.slug }).from(projects).where(eq(projects.id, row.projectId))
      : [];
    return {
      ...summaryOf(row, items.length),
      description: row.description,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      cover: row.coverMediaId ? (media.get(row.coverMediaId) ?? null) : null,
      project: project ?? null,
      items: items.map((item) => itemDto(item, media.get(item.mediaId) ?? null)),
      publication: await publication(tx, row),
    };
  }

  return {
    async list() {
      const repo = createAlbumRepository(db);
      const rows = await repo.list();
      return Promise.all(
        rows.map(async (row) => {
          const items = await repo.listItems(row.id);
          const cover = row.coverMediaId ?? items[0]?.mediaId ?? null;
          const media = cover ? await createMediaService(db).dtosByIds([cover]) : new Map();
          return { ...summaryOf(row, items.length), cover: cover ? (media.get(cover) ?? null) : null, publication: await publication(db, row) };
        }),
      );
    },

    async get(id: string) {
      return detail(db, await requireAlbum(db, id));
    },

    async create(input: { title: string; slug: string; description?: string | null; collection?: string | null; projectId?: string | null }) {
      return transaction(db, async (tx) => {
        const repo = createAlbumRepository(tx);
        await repo.lockOrdering();
        if (await repo.slugTaken(input.slug)) throw conflict("ALBUM_SLUG_TAKEN", "Another album already uses this address.");
        if (input.projectId) await requireProject(tx, input.projectId);
        const row = await repo.insert({
          title: input.title,
          slug: input.slug,
          description: input.description ?? null,
          collection: input.collection?.trim() || null,
          projectId: input.projectId ?? null,
          displayPosition: await repo.count(),
        });
        return detail(tx, row);
      });
    },

    async update(id: string, input: UpdateAlbum) {
      let visible = false;
      const result = await transaction(db, async (tx) => {
        const repo = createAlbumRepository(tx);
        const row = await requireAlbum(tx, id, "update");
        if (input.slug && input.slug !== row.slug && (await repo.slugTaken(input.slug, id))) {
          throw conflict("ALBUM_SLUG_TAKEN", "Another album already uses this address.");
        }
        if (input.coverMediaId) await requireImage(tx, input.coverMediaId, "coverMediaId");
        if (input.projectId) await requireProject(tx, input.projectId);
        const patch = { ...input, ...(input.collection !== undefined ? { collection: input.collection?.trim() || null } : {}) };
        const updated = await repo.update(id, patch);
        // Slug and the related project are live: a published album changes
        // address, or its project link, at once (ADR-0019 §3).
        visible = row.status === "PUBLISHED" && ((input.slug !== undefined && input.slug !== row.slug) || (input.projectId !== undefined && input.projectId !== row.projectId));
        return detail(tx, updated);
      });
      if (visible) publicChange();
      return result;
    },

    // Soft delete: archived, unpublished, out of the order. Its images'
    // Media Library assets stay (ADR-0019 §1).
    async softDelete(id: string) {
      await transaction(db, async (tx) => {
        const repo = createAlbumRepository(tx);
        await repo.lockOrdering();
        await requireAlbum(tx, id, "update");
        await repo.deletePublication(id);
        await repo.update(id, { deletedAt: new Date(), status: "ARCHIVED" });
        await repo.compactOrder();
      });
      publicChange();
    },

    // The complete set of live albums, in their new order (ADR-0002).
    async reorder(albumIds: string[]) {
      await transaction(db, async (tx) => {
        const repo = createAlbumRepository(tx);
        await repo.lockOrdering();
        const current = await repo.list();
        const ids = new Set(current.map((row) => row.id));
        if (current.length !== albumIds.length || !albumIds.every((albumId) => ids.has(albumId))) {
          throw conflict("REORDER_SET_MISMATCH", "The order must list every album exactly once.");
        }
        await repo.setPositions(albumIds);
      });
      publicChange();
    },

    // ADR-0005: omitted appends; 0..N inserts and shifts right; > N is 422.
    async addItem(albumId: string, input: { mediaId: string; position?: number; altText?: string | null; caption?: string | null }) {
      return transaction(db, async (tx) => {
        const repo = createAlbumRepository(tx);
        await requireAlbum(tx, albumId, "update");
        await requireImage(tx, input.mediaId, "mediaId");
        const items = await repo.listItems(albumId);
        // An image appears once in an album.
        if (items.some((item) => item.mediaId === input.mediaId)) {
          throw conflict("ALBUM_MEDIA_DUPLICATE", "This image is already in the album.");
        }
        const n = items.length;
        const position = input.position ?? n;
        if (position > n) throw validationError([{ path: "position", message: `must be between 0 and ${n}; omit it to append` }]);
        await repo.shiftItemsRight(albumId, position);
        const row = await repo.insertItem({
          albumId,
          mediaId: input.mediaId,
          position,
          altText: input.altText ?? null,
          caption: input.caption?.trim() || null,
        });
        const media = await createMediaService(tx).dtosByIds([row.mediaId]);
        return itemDto(row, media.get(row.mediaId) ?? null);
      });
    },

    async updateItem(albumId: string, itemId: string, input: { altText?: string | null; caption?: string | null }) {
      return transaction(db, async (tx) => {
        const repo = createAlbumRepository(tx);
        await requireAlbum(tx, albumId, "update");
        if (!(await repo.findItem(albumId, itemId))) throw itemNotFound();
        const row = await repo.updateItem(itemId, {
          ...(input.altText === undefined ? {} : { altText: input.altText }),
          ...(input.caption === undefined ? {} : { caption: input.caption?.trim() || null }),
        });
        const media = await createMediaService(tx).dtosByIds([row.mediaId]);
        return itemDto(row, media.get(row.mediaId) ?? null);
      });
    },

    // Only the reference goes; the asset stays in the Media Library.
    async removeItem(albumId: string, itemId: string) {
      await transaction(db, async (tx) => {
        const repo = createAlbumRepository(tx);
        await requireAlbum(tx, albumId, "update");
        const item = await repo.findItem(albumId, itemId);
        if (!item) throw itemNotFound();
        await repo.deleteItem(itemId);
        await repo.closeItemGap(albumId, item.position);
      });
    },

    // The complete set of an album's images, in their new order (ADR-0002).
    async reorderItems(albumId: string, itemIds: string[]) {
      await transaction(db, async (tx) => {
        const repo = createAlbumRepository(tx);
        await requireAlbum(tx, albumId, "update");
        const current = await repo.listItems(albumId);
        const ids = new Set(current.map((item) => item.id));
        if (current.length !== itemIds.length || !itemIds.every((itemId) => ids.has(itemId))) {
          throw conflict("REORDER_SET_MISMATCH", "The order must list every image of the album exactly once.");
        }
        await repo.setItemPositions(itemIds);
      });
    },

    // Validates the working copy and writes the album's one current snapshot,
    // or refuses with every reason; nothing is written on refusal.
    async publish(albumId: string, adminId: string | null) {
      const result = await transaction(db, async (tx) => {
        const repo = createAlbumRepository(tx);
        const row = await requireAlbum(tx, albumId, "update");
        const snapshot = await buildAlbumSnapshot(tx, row);
        const issues = albumIssues(snapshot, row.slug);
        if (issues.length) {
          throw invalid("ALBUM_NOT_PUBLISHABLE", "The album cannot be published yet.", {
            issues: issues.map((message) => ({ path: "", message })),
          });
        }
        await repo.savePublication(row.id, snapshot, snapshot.media.map((m) => m.id), adminId);
        const updated = await repo.update(row.id, { status: "PUBLISHED", publishedAt: new Date() });
        return detail(tx, updated);
      });
      publicChange();
      return result;
    },

    async unpublish(albumId: string) {
      const result = await transaction(db, async (tx) => {
        const repo = createAlbumRepository(tx);
        const row = await requireAlbum(tx, albumId, "update");
        await repo.deletePublication(row.id);
        const updated = await repo.update(row.id, { status: "DRAFT" });
        return detail(tx, updated);
      });
      publicChange();
      return result;
    },
  };
}

function summaryOf(row: AlbumRow, itemCount: number) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    collection: row.collection,
    status: row.status,
    displayPosition: row.displayPosition,
    itemCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function itemDto(row: AlbumMediaRow, media: MediaDto | null) {
  return { id: row.id, position: row.position, altText: row.altText, caption: row.caption, media };
}

export type AlbumService = ReturnType<typeof createAlbumService>;
export type AlbumDetailDto = Awaited<ReturnType<AlbumService["get"]>>;
export type AlbumSummaryDto = Awaited<ReturnType<AlbumService["list"]>>[number];
