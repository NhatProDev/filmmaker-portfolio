import type { Database } from "@db/client";
import type { MediaRecord } from "@/features/media/media.repository";
import type { BlockRecord } from "@/features/project-builder/block.repository";
import { createPublicationRepository, type PublishedProject } from "@/features/project-builder/publication.repository";
import { parseProjectSnapshot, type ProjectSnapshot } from "@/features/site-content/snapshot-projection";
import { isPrivateKey } from "@/lib/storage/media-storage";
import { mediaUrl } from "@/lib/storage/media-url";

// The public project resources of /api/v1 (openapi.yaml `PublicProject*`),
// built from published snapshots only (ADR-0012). PRIVATE projects are never
// listed (ADR-0003); one is returned only to a caller whose access was
// verified, with media behind the access-checked route (ADR-0014 §4).

type UrlFor = (asset: MediaRecord) => string;

// A private object never has a public URL; publishing refuses such a public
// page, so this empty value is only a guard.
const publicUrl: UrlFor = (asset) =>
  asset.storageKey && !isPrivateKey(asset.storageKey) ? mediaUrl(asset.storageKey) : "";
const privateUrl =
  (slug: string): UrlFor =>
  (asset) =>
    `/api/v1/public/projects/${slug}/media/${asset.id}`;

function mediaView(byId: Map<string, MediaRecord>, url: UrlFor) {
  const image = (id: string | null, alt: string) => {
    const asset = id ? byId.get(id) : undefined;
    return asset ? { url: url(asset), width: asset.width, height: asset.height, alt } : null;
  };
  return (mediaId: string | null, placement: { altText: string | null; posterMediaId: string | null } | null) => {
    const asset = mediaId ? byId.get(mediaId) : undefined;
    if (!asset) return null;
    // Contextual alt (ADR-0011) and the poster chain (ADR-0015).
    const alt = placement?.altText ?? asset.altText ?? "";
    const posterId = asset.type === "IMAGE" ? null : (placement?.posterMediaId ?? asset.posterMediaId);
    return {
      id: asset.id,
      type: asset.type,
      url: url(asset),
      mimeType: asset.mimeType,
      width: asset.width,
      height: asset.height,
      durationMs: asset.durationMs,
      alt,
      poster: image(posterId, alt),
    };
  };
}

function toSummary({ project }: PublishedProject, snapshot: ProjectSnapshot) {
  const view = mediaView(new Map(snapshot.media.map((m) => [m.id, m])), publicUrl);
  return {
    id: project.id,
    title: snapshot.project.title,
    slug: project.slug,
    shortDescription: snapshot.project.shortDescription,
    year: snapshot.project.year,
    category: snapshot.project.category,
    cover: view(snapshot.project.coverMediaId, null),
    preview: view(snapshot.project.previewMediaId, null),
    isFeatured: project.isFeatured,
    displayPosition: project.displayPosition,
  };
}

function toDetail(row: PublishedProject, snapshot: ProjectSnapshot, url: UrlFor) {
  const view = mediaView(new Map(snapshot.media.map((m) => [m.id, m])), url);
  const block = (b: BlockRecord): unknown => ({
    id: b.id,
    type: b.type,
    content: b.content,
    config: b.config,
    media: b.media.map((item) => view(item.mediaId, item)).filter(Boolean),
    children: b.children.map(block),
  });
  const { project } = snapshot;
  return {
    id: project.id,
    title: project.title,
    slug: row.project.slug,
    shortDescription: project.shortDescription,
    description: project.description,
    year: project.year,
    category: project.category,
    client: project.client,
    role: project.role,
    runtime: project.runtime,
    credits: project.credits,
    cover: view(project.coverMediaId, null),
    preview: view(project.previewMediaId, null),
    blocks: snapshot.blocks.map(block),
    publishedAt: row.publishedAt.toISOString(),
  };
}

export function createPublicProjectService(db: Database) {
  const publications = createPublicationRepository(db);
  return {
    async list(query: { page: number; pageSize: number; featured?: boolean; category?: string }) {
      const rows = (await publications.listPublicPublished())
        .map((row) => ({ row, snapshot: parseProjectSnapshot(row.snapshot, `project ${row.project.slug}`) }))
        .filter(({ row }) => query.featured === undefined || row.project.isFeatured === query.featured)
        .filter(({ snapshot }) => query.category === undefined || snapshot.project.category === query.category);
      const start = (query.page - 1) * query.pageSize;
      return {
        data: rows.slice(start, start + query.pageSize).map(({ row, snapshot }) => toSummary(row, snapshot)),
        meta: { page: query.page, pageSize: query.pageSize, total: rows.length },
      };
    },

    // null: no such published project. "locked": PRIVATE and the caller holds
    // no valid access, so nothing of the project is returned.
    async get(slug: string, hasAccess: (projectId: string) => Promise<boolean>) {
      const row = await publications.findPublishedBySlug(slug);
      if (!row) return null;
      const isPrivate = row.project.visibility === "PRIVATE";
      if (isPrivate && !(await hasAccess(row.project.id))) return "locked" as const;
      const snapshot = parseProjectSnapshot(row.snapshot, `project ${slug}`);
      return toDetail(row, snapshot, isPrivate ? privateUrl(slug) : publicUrl);
    },
  };
}
