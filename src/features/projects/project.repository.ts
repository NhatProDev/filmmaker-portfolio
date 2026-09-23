import { and, asc, count, eq, ilike, isNotNull, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import type { Database } from "@db/client";
import { projects, type NewProject, type Project as ProjectRow } from "@db/schema";

export type { ProjectRow };

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

const live = isNull(projects.deletedAt);

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
        .where(and(eq(projects.status, "PUBLISHED"), live, eq(projects.visibility, "PUBLIC")))
        .orderBy(asc(projects.displayPosition), asc(projects.id));
    },

    // Serialises every change to the project orders for the rest of the
    // transaction (CLAUDE.md §15): creation appends, deletion closes gaps,
    // and reorders replace the whole sequence.
    async lockOrdering() {
      await db.execute(sql`select pg_advisory_xact_lock(hashtext('projects.ordering'))`);
    },

    async list(filter: {
      status?: ProjectRow["status"];
      visibility?: ProjectRow["visibility"];
      search?: string;
      page: number;
      pageSize: number;
    }): Promise<{ rows: ProjectRow[]; total: number }> {
      const conditions: SQL[] = [live];
      if (filter.status) conditions.push(eq(projects.status, filter.status));
      if (filter.visibility) conditions.push(eq(projects.visibility, filter.visibility));
      if (filter.search) {
        const pattern = `%${filter.search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
        conditions.push(or(ilike(projects.title, pattern), ilike(projects.slug, pattern))!);
      }
      const where = and(...conditions);
      const [rows, [{ total }]] = await Promise.all([
        db
          .select()
          .from(projects)
          .where(where)
          .orderBy(asc(projects.displayPosition), asc(projects.id))
          .limit(filter.pageSize)
          .offset((filter.page - 1) * filter.pageSize),
        db.select({ total: count() }).from(projects).where(where),
      ]);
      return { rows, total };
    },

    async findById(id: string, lock?: "update"): Promise<ProjectRow | null> {
      const query = db.select().from(projects).where(and(eq(projects.id, id), live));
      const [row] = lock ? await query.for(lock) : await query;
      return row ?? null;
    },

    async findBySlug(slug: string): Promise<ProjectRow | null> {
      const [row] = await db.select().from(projects).where(and(eq(projects.slug, slug), live));
      return row ?? null;
    },

    // Slugs are unique across every row, soft-deleted ones included.
    async slugTaken(slug: string, exceptId?: string): Promise<boolean> {
      const [row] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(exceptId ? and(eq(projects.slug, slug), ne(projects.id, exceptId)) : eq(projects.slug, slug));
      return Boolean(row);
    },

    async countLive(): Promise<number> {
      const [{ n }] = await db.select({ n: count() }).from(projects).where(live);
      return n;
    },

    async countFeatured(): Promise<number> {
      const [{ n }] = await db
        .select({ n: count() })
        .from(projects)
        .where(and(live, eq(projects.isFeatured, true)));
      return n;
    },

    async insert(values: NewProject): Promise<ProjectRow> {
      const [row] = await db.insert(projects).values(values).returning();
      return row;
    },

    async update(id: string, patch: Partial<NewProject>): Promise<ProjectRow> {
      const [row] = await db
        .update(projects)
        .set({ ...patch, updatedAt: sql`now()` })
        .where(eq(projects.id, id))
        .returning();
      return row;
    },

    async liveIds(): Promise<string[]> {
      const rows = await db
        .select({ id: projects.id })
        .from(projects)
        .where(live)
        .orderBy(asc(projects.displayPosition), asc(projects.id));
      return rows.map((row) => row.id);
    },

    async featuredIds(): Promise<string[]> {
      const rows = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(live, eq(projects.isFeatured, true)))
        .orderBy(asc(projects.featuredPosition), asc(projects.id));
      return rows.map((row) => row.id);
    },

    async setDisplayPositions(ids: readonly string[]) {
      for (const [position, id] of ids.entries()) {
        await db.update(projects).set({ displayPosition: position }).where(eq(projects.id, id));
      }
    },

    async setFeaturedPositions(ids: readonly string[]) {
      for (const [position, id] of ids.entries()) {
        await db.update(projects).set({ featuredPosition: position }).where(eq(projects.id, id));
      }
    },

    // Renumbers both orders contiguously from 0, keeping their relative order.
    async compactOrders() {
      await db.execute(sql`
        update ${projects} p set display_position = r.n - 1
        from (select id, row_number() over (order by display_position, id) as n
              from ${projects} where deleted_at is null) r
        where p.id = r.id and p.display_position <> r.n - 1`);
      await db.execute(sql`
        update ${projects} p set featured_position = r.n - 1
        from (select id, row_number() over (order by featured_position nulls last, id) as n
              from ${projects} where deleted_at is null and is_featured) r
        where p.id = r.id and p.featured_position is distinct from r.n - 1`);
      await db
        .update(projects)
        .set({ featuredPosition: null })
        .where(and(eq(projects.isFeatured, false), isNotNull(projects.featuredPosition)));
    },
  };
}

export type ProjectRepository = ReturnType<typeof createProjectRepository>;
