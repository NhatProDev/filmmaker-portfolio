import { z } from "zod";
import { compositionSnapshotShape } from "@/features/project-builder/snapshot";
import type { PublicProjectRecord } from "@/features/projects/project.repository";
import { projectCreditsSchema } from "@/features/projects/project.schema";
import {
  ContentProjectionError,
  createMediaIndex,
  homeContent,
  parseTree,
  worksProject,
  type MediaIndex,
} from "./db-projection";
import { projectPageContent, type ProjectPageContent } from "./project-blocks";
import type { HomeContent, WorksProject } from "./site-content.types";

// The published snapshots (ADR-0012) and their projection onto the locked
// public templates. A snapshot is validated against its schema before it is
// written and again whenever it is read; anything that fails is refused, never
// repaired.

const nullableText = z.string().nullable();

export const projectSnapshotSchema = z.strictObject({
  version: z.literal(1),
  project: z.strictObject({
    id: z.uuid(),
    title: z.string().min(1),
    year: z.int().nullable(),
    category: nullableText,
    client: nullableText,
    role: nullableText,
    runtime: nullableText,
    shortDescription: nullableText,
    description: nullableText,
    credits: projectCreditsSchema,
    seoTitle: nullableText,
    seoDescription: nullableText,
    coverMediaId: z.uuid().nullable(),
    previewMediaId: z.uuid().nullable(),
  }),
  ...compositionSnapshotShape,
});

export type ProjectSnapshot = z.infer<typeof projectSnapshotSchema>;

export const pageSnapshotSchema = z.strictObject({
  version: z.literal(1),
  page: z.strictObject({
    id: z.uuid(),
    key: z.string(),
    title: z.string(),
    seoTitle: nullableText,
    seoDescription: nullableText,
  }),
  ...compositionSnapshotShape,
});

export type PageSnapshot = z.infer<typeof pageSnapshotSchema>;

function parse<T>(schema: z.ZodType<T>, value: unknown, where: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ContentProjectionError(`${where}: the snapshot is invalid — ${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export const parseProjectSnapshot = (value: unknown, where: string) => parse(projectSnapshotSchema, value, where);
export const parsePageSnapshot = (value: unknown, where: string) => parse(pageSnapshotSchema, value, where);

// The slug is a live routing field (ADR-0012), not part of the snapshot.
export function projectRecord(snapshot: ProjectSnapshot, slug: string): PublicProjectRecord {
  const { project } = snapshot;
  return {
    id: project.id,
    slug,
    title: project.title,
    year: project.year,
    client: project.client,
    role: project.role,
    runtime: project.runtime,
    credits: project.credits,
    coverMediaId: project.coverMediaId,
    previewMediaId: project.previewMediaId,
  };
}

export type RenderedProject = { works: WorksProject; page: ProjectPageContent };

// A PRIVATE project's media, public or private, are delivered only through
// its access-checked route; nothing it references resolves to an
// unrestricted public URL (ADR-0014 §4, ADR-0020).
export const privateProjectMediaUrl =
  (slug: string): MediaIndex["url"] =>
  (asset) =>
    `/api/v1/public/projects/${slug}/media/${asset.id}`;

export function renderProject(snapshot: ProjectSnapshot, slug: string, url?: MediaIndex["url"]): RenderedProject {
  const record = projectRecord(snapshot, slug);
  const index = createMediaIndex(snapshot.media, url);
  const works = worksProject(record, index);
  const tree = parseTree(snapshot.blocks, "project", `project ${slug}`);
  return { works, page: projectPageContent(record, tree, index, works.cover) };
}

export function renderHome(snapshot: PageSnapshot, footer: HomeContent["footer"], url?: MediaIndex["url"]): HomeContent {
  const tree = parseTree(snapshot.blocks, "page", "page HOME");
  return homeContent(tree, createMediaIndex(snapshot.media, url), footer);
}

// Why a snapshot could not be published: empty when the locked templates can
// render it exactly.
export function renderIssues(render: () => unknown): string[] {
  try {
    render();
    return [];
  } catch (error) {
    if (error instanceof ContentProjectionError) return [error.message];
    throw error;
  }
}
