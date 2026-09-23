import { toMediaRef, type MediaRow } from "@/features/media/media.mapper";
import type { BlockDto } from "@/features/project-builder/composition.mapper";
import type { ProjectRow } from "./project.repository";

// Project DTOs (openapi.yaml). The password hash never reaches them; only the
// derived `hasPassword` does (CLAUDE.md §4, §17.4).

export type PublicationDto = {
  isPublished: boolean;
  publishedAt: string | null;
  hasUnpublishedChanges: boolean;
  issues: string[];
};

export function toProjectSummaryDto(row: ProjectRow, cover: MediaRow | null, publishedAt: Date | null) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    shortDescription: row.shortDescription,
    year: row.year,
    category: row.category,
    status: row.status,
    visibility: row.visibility,
    hasPassword: row.passwordHash !== null,
    cover: cover ? toMediaRef(cover) : null,
    isFeatured: row.isFeatured,
    featuredPosition: row.featuredPosition,
    displayPosition: row.displayPosition,
    publishedAt: publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type ProjectSummaryDto = ReturnType<typeof toProjectSummaryDto>;

export function toProjectDetailDto(
  row: ProjectRow,
  media: { cover: MediaRow | null; preview: MediaRow | null },
  blocks: BlockDto[],
  publication: PublicationDto,
) {
  return {
    ...toProjectSummaryDto(row, media.cover, publication.publishedAt ? new Date(publication.publishedAt) : null),
    description: row.description,
    client: row.client,
    role: row.role,
    runtime: row.runtime,
    credits: row.credits as { role: string; name: string }[],
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    coverMediaId: row.coverMediaId,
    previewMediaId: row.previewMediaId,
    preview: media.preview ? toMediaRef(media.preview) : null,
    blocks,
    publication,
  };
}

export type ProjectDetailDto = ReturnType<typeof toProjectDetailDto>;
