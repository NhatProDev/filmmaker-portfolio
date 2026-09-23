import { and, asc, eq, isNull } from "drizzle-orm";
import type { Database } from "@db/client";
import { projects } from "@db/schema";

export type PublicProjectRecord = {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  client: string | null;
  role: string | null;
  runtime: string | null;
  // JSONB, validated by projectCreditsSchema before use.
  credits: unknown;
  coverMediaId: string | null;
  previewMediaId: string | null;
};

export function createProjectRepository(db: Database) {
  return {
    // The public listing: published, not deleted, PUBLIC, in display order.
    // PRIVATE projects are never enumerated (ADR-0003).
    async listPublic(): Promise<PublicProjectRecord[]> {
      return db
        .select({
          id: projects.id,
          slug: projects.slug,
          title: projects.title,
          year: projects.year,
          client: projects.client,
          role: projects.role,
          runtime: projects.runtime,
          credits: projects.credits,
          coverMediaId: projects.coverMediaId,
          previewMediaId: projects.previewMediaId,
        })
        .from(projects)
        .where(
          and(eq(projects.status, "PUBLISHED"), isNull(projects.deletedAt), eq(projects.visibility, "PUBLIC")),
        )
        .orderBy(asc(projects.displayPosition), asc(projects.id));
    },
  };
}
