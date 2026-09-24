import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// Foreign keys are named explicitly, in PostgreSQL's default <table>_<column>_fkey
// form, so that the names Drizzle records match the names 0001_initial.sql
// created. JSONB columns are typed `unknown` on purpose: nothing read from
// them is trusted until it has been validated by the schemas in
// src/features/*/…schema.ts (ADR-0011).

export const projectStatusEnum = pgEnum("project_status", [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);

export const projectVisibilityEnum = pgEnum("project_visibility", [
  "PUBLIC",
  "PRIVATE",
]);

export const blockTypeEnum = pgEnum("block_type", [
  "HERO",
  "TEXT",
  "IMAGE",
  "VIDEO",
  "GRID",
  "GALLERY",
  "SPACER",
]);

export const mediaTypeEnum = pgEnum("media_type", [
  "IMAGE",
  "VIDEO",
  "EXTERNAL_VIDEO",
]);

export const mediaStatusEnum = pgEnum("media_status", [
  "UPLOADING",
  "PROCESSING",
  "READY",
  "FAILED",
]);

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    name: varchar("name", { length: 200 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    lastLoginAt: timestamp("last_login_at", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (table) => [uniqueIndex("admin_users_email_uidx").on(table.email)],
);

// A Media Library asset. Its identity is storage provider + storage key, and
// its content identity is the checksum; delivery URLs are derived at read time
// (ADR-0014). `url` is kept for EXTERNAL_VIDEO and legacy use only, and
// `thumbnail_url` as ADR-0009's automatic poster fallback.
export const media = pgTable(
  "media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: mediaTypeEnum("type").notNull(),
    status: mediaStatusEnum("status").default("UPLOADING").notNull(),

    storageProvider: varchar("storage_provider", { length: 100 }),
    storageKey: text("storage_key"),
    url: text("url"),
    thumbnailUrl: text("thumbnail_url"),

    externalProvider: varchar("external_provider", { length: 100 }),
    externalUrl: text("external_url"),

    filename: text("filename"),
    originalFilename: text("original_filename"),
    mimeType: varchar("mime_type", { length: 255 }),

    width: integer("width"),
    height: integer("height"),
    durationMs: integer("duration_ms"),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
    checksumSha256: varchar("checksum_sha256", { length: 64 }),

    // The asset's default description; a placement may override it (ADR-0011).
    altText: text("alt_text"),

    // An administrator-selected poster: an IMAGE asset (ADR-0009).
    posterMediaId: uuid("poster_media_id"),

    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    foreignKey({
      name: "media_poster_media_id_fkey",
      columns: [table.posterMediaId],
      foreignColumns: [table.id],
    }).onDelete("restrict"),
    index("media_type_idx").on(table.type),
    index("media_status_idx").on(table.status),
    index("media_created_at_idx").on(table.createdAt),
    index("media_poster_media_id_idx").on(table.posterMediaId),
    uniqueIndex("media_storage_identity_uidx")
      .on(table.storageProvider, table.storageKey)
      .where(sql`${table.storageKey} IS NOT NULL`),
    uniqueIndex("media_checksum_active_uidx")
      .on(table.checksumSha256)
      .where(sql`${table.checksumSha256} IS NOT NULL AND ${table.deletedAt} IS NULL`),
    check(
      "media_dimensions_positive_check",
      sql`(${table.width} IS NULL OR ${table.width} > 0) AND (${table.height} IS NULL OR ${table.height} > 0)`,
    ),
    check(
      "media_duration_nonnegative_check",
      sql`${table.durationMs} IS NULL OR ${table.durationMs} >= 0`,
    ),
    check(
      "media_file_size_nonnegative_check",
      sql`${table.fileSizeBytes} IS NULL OR ${table.fileSizeBytes} >= 0`,
    ),
    check(
      "media_checksum_format_check",
      sql`${table.checksumSha256} IS NULL OR ${table.checksumSha256} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "media_poster_not_self_check",
      sql`${table.posterMediaId} IS NULL OR ${table.posterMediaId} <> ${table.id}`,
    ),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    title: varchar("title", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),

    shortDescription: varchar("short_description", { length: 500 }),
    description: text("description"),

    year: integer("year"),
    category: varchar("category", { length: 120 }),
    client: varchar("client", { length: 200 }),
    // The owner's role and the runtime, as displayed (ADR-0011).
    role: varchar("role", { length: 200 }),
    runtime: varchar("runtime", { length: 100 }),

    credits: jsonb("credits").$type<unknown>().default([]).notNull(),

    status: projectStatusEnum("status").default("DRAFT").notNull(),
    visibility: projectVisibilityEnum("visibility").default("PUBLIC").notNull(),
    passwordHash: text("password_hash"),

    coverMediaId: uuid("cover_media_id"),
    // The Works moving preview: an explicit per-project choice (ADR-0011).
    previewMediaId: uuid("preview_media_id"),

    isFeatured: boolean("is_featured").default(false).notNull(),
    featuredPosition: integer("featured_position"),
    displayPosition: integer("display_position").default(0).notNull(),

    seoTitle: varchar("seo_title", { length: 200 }),
    seoDescription: varchar("seo_description", { length: 500 }),

    publishedAt: timestamp("published_at", {
      withTimezone: true,
      mode: "date",
    }),

    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    foreignKey({
      name: "projects_cover_media_id_fkey",
      columns: [table.coverMediaId],
      foreignColumns: [media.id],
    }).onDelete("set null"),
    foreignKey({
      name: "projects_preview_media_id_fkey",
      columns: [table.previewMediaId],
      foreignColumns: [media.id],
    }).onDelete("set null"),
    uniqueIndex("projects_slug_uidx").on(table.slug),
    index("projects_status_idx").on(table.status),
    index("projects_visibility_idx").on(table.visibility),
    index("projects_public_order_idx").on(
      table.status,
      table.deletedAt,
      table.displayPosition,
    ),
    index("projects_featured_order_idx").on(
      table.isFeatured,
      table.featuredPosition,
    ),
    // The MEDIA_IN_USE query reads both media references on every deletion.
    index("projects_cover_media_id_idx").on(table.coverMediaId),
    index("projects_preview_media_id_idx").on(table.previewMediaId),
    check(
      "projects_private_password_check",
      sql`${table.visibility} <> 'PRIVATE' OR ${table.passwordHash} IS NOT NULL`,
    ),
    check(
      "projects_year_range_check",
      sql`${table.year} IS NULL OR (${table.year} >= 1900 AND ${table.year} <= 2100)`,
    ),
    check(
      "projects_display_position_nonnegative_check",
      sql`${table.displayPosition} >= 0`,
    ),
    check(
      "projects_featured_position_nonnegative_check",
      sql`${table.featuredPosition} IS NULL OR ${table.featuredPosition} >= 0`,
    ),
  ],
);

// Singleton editorial pages that own a block composition, keyed rather than
// slugged (ADR-0007). HOME is the only one in V1; it is seeded by migration.
export const pages = pgTable(
  "pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: varchar("key", { length: 50 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    seoTitle: varchar("seo_title", { length: 200 }),
    seoDescription: varchar("seo_description", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("pages_key_uidx").on(table.key),
    check("pages_key_format_check", sql`${table.key} ~ '^[A-Z][A-Z0-9_]*$'`),
  ],
);

// A composer block. A root block is owned by exactly one project or page; a
// child belongs only to its parent GRID (ADR-0006, ADR-0007, ADR-0013). Order
// is `position` within the container. `content` is editorial data and
// `config` presentation; both are validated per block type (ADR-0011).
export const projectBlocks = pgTable(
  "project_blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id"),
    pageId: uuid("page_id"),
    parentBlockId: uuid("parent_block_id"),
    type: blockTypeEnum("type").notNull(),
    position: integer("position").notNull(),
    isHidden: boolean("is_hidden").default(false).notNull(),
    content: jsonb("content").$type<unknown>().default({}).notNull(),
    config: jsonb("config").$type<unknown>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "project_blocks_project_id_fkey",
      columns: [table.projectId],
      foreignColumns: [projects.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "project_blocks_page_id_fkey",
      columns: [table.pageId],
      foreignColumns: [pages.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "project_blocks_parent_block_id_fkey",
      columns: [table.parentBlockId],
      foreignColumns: [table.id],
    }).onDelete("cascade"),
    index("project_blocks_project_id_idx").on(table.projectId),
    index("project_blocks_project_position_idx").on(
      table.projectId,
      table.position,
    ),
    index("project_blocks_page_position_idx").on(table.pageId, table.position),
    index("project_blocks_parent_position_idx").on(
      table.parentBlockId,
      table.position,
    ),
    check(
      "project_blocks_position_nonnegative_check",
      sql`${table.position} >= 0`,
    ),
    check(
      "project_blocks_single_owner_check",
      sql`(${table.projectId} IS NOT NULL AND ${table.pageId} IS NULL AND ${table.parentBlockId} IS NULL)
        OR (${table.projectId} IS NULL AND ${table.pageId} IS NOT NULL AND ${table.parentBlockId} IS NULL)
        OR (${table.projectId} IS NULL AND ${table.pageId} IS NULL AND ${table.parentBlockId} IS NOT NULL)`,
    ),
    check(
      "project_blocks_leaf_child_check",
      sql`${table.parentBlockId} IS NULL OR ${table.type} IN ('HERO', 'TEXT', 'IMAGE', 'VIDEO', 'SPACER')`,
    ),
    check(
      "project_blocks_parent_not_self_check",
      sql`${table.parentBlockId} IS NULL OR ${table.parentBlockId} <> ${table.id}`,
    ),
  ],
);

// A media placement inside a block. `alt_text` overrides the asset's default
// for this use: NULL inherits, '' marks the use decorative (ADR-0011).
// `poster_media_id` overrides the video asset's default poster for this use
// only; NULL inherits it (ADR-0015).
export const blockMedia = pgTable(
  "block_media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    blockId: uuid("block_id").notNull(),
    mediaId: uuid("media_id").notNull(),
    position: integer("position").notNull(),
    altText: text("alt_text"),
    posterMediaId: uuid("poster_media_id"),
    config: jsonb("config").$type<unknown>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "block_media_block_id_fkey",
      columns: [table.blockId],
      foreignColumns: [projectBlocks.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "block_media_media_id_fkey",
      columns: [table.mediaId],
      foreignColumns: [media.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "block_media_poster_media_id_fkey",
      columns: [table.posterMediaId],
      foreignColumns: [media.id],
    }).onDelete("restrict"),
    index("block_media_block_id_idx").on(table.blockId),
    index("block_media_poster_media_id_idx").on(table.posterMediaId),
    index("block_media_block_position_idx").on(
      table.blockId,
      table.position,
    ),
    index("block_media_media_id_idx").on(table.mediaId),
    check(
      "block_media_position_nonnegative_check",
      sql`${table.position} >= 0`,
    ),
  ],
);

// The single current published snapshot of a project or page (ADR-0012): a
// validated copy of what the public site renders. Publishing replaces it;
// unpublishing deletes it. Never more than one per owner, never history.
export const projectPublications = pgTable(
  "project_publications",
  {
    projectId: uuid("project_id").primaryKey(),
    snapshot: jsonb("snapshot").$type<unknown>().notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    publishedBy: uuid("published_by"),
  },
  (table) => [
    foreignKey({
      name: "project_publications_project_id_fkey",
      columns: [table.projectId],
      foreignColumns: [projects.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "project_publications_published_by_fkey",
      columns: [table.publishedBy],
      foreignColumns: [adminUsers.id],
    }).onDelete("set null"),
  ],
);

export const pagePublications = pgTable(
  "page_publications",
  {
    pageId: uuid("page_id").primaryKey(),
    snapshot: jsonb("snapshot").$type<unknown>().notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    publishedBy: uuid("published_by"),
  },
  (table) => [
    foreignKey({
      name: "page_publications_page_id_fkey",
      columns: [table.pageId],
      foreignColumns: [pages.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "page_publications_published_by_fkey",
      columns: [table.publishedBy],
      foreignColumns: [adminUsers.id],
    }).onDelete("set null"),
  ],
);

// Every media asset a current snapshot references, relationally, so that
// MEDIA_IN_USE protects what is live even after the working copy stops using
// it (ADR-0012, CLAUDE.md §12). Exactly one owner per row.
export const publicationMedia = pgTable(
  "publication_media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id"),
    pageId: uuid("page_id"),
    mediaId: uuid("media_id").notNull(),
  },
  (table) => [
    foreignKey({
      name: "publication_media_project_id_fkey",
      columns: [table.projectId],
      foreignColumns: [projectPublications.projectId],
    }).onDelete("cascade"),
    foreignKey({
      name: "publication_media_page_id_fkey",
      columns: [table.pageId],
      foreignColumns: [pagePublications.pageId],
    }).onDelete("cascade"),
    foreignKey({
      name: "publication_media_media_id_fkey",
      columns: [table.mediaId],
      foreignColumns: [media.id],
    }).onDelete("restrict"),
    uniqueIndex("publication_media_project_media_uidx").on(table.projectId, table.mediaId),
    uniqueIndex("publication_media_page_media_uidx").on(table.pageId, table.mediaId),
    index("publication_media_media_id_idx").on(table.mediaId),
    check(
      "publication_media_single_owner_check",
      sql`(${table.projectId} IS NOT NULL AND ${table.pageId} IS NULL) OR (${table.projectId} IS NULL AND ${table.pageId} IS NOT NULL)`,
    ),
  ],
);

// A revocable admin session (CLAUDE.md §11, §16). The cookie carries a random
// token; only its SHA-256 is stored, so reading this table cannot replay a
// session. Logout sets revoked_at; expiry is absolute.
export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adminUserId: uuid("admin_user_id").notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    userAgent: varchar("user_agent", { length: 400 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    foreignKey({
      name: "admin_sessions_admin_user_id_fkey",
      columns: [table.adminUserId],
      foreignColumns: [adminUsers.id],
    }).onDelete("cascade"),
    uniqueIndex("admin_sessions_token_hash_uidx").on(table.tokenHash),
    index("admin_sessions_admin_user_id_idx").on(table.adminUserId),
    check("admin_sessions_token_hash_format_check", sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`),
  ],
);

// Fixed-window attempt counters for admin login and private-project passwords
// (CLAUDE.md §11, §16). Kept in PostgreSQL so the limit holds across server
// instances. A key names the action and its subject, never a password.
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: varchar("key", { length: 300 }).primaryKey(),
    count: integer("count").notNull(),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [check("rate_limits_count_positive_check", sql`${table.count} > 0`)],
);

// Relations are declared after all tables to avoid declaration-order issues.
export const projectsRelations = relations(projects, ({ one, many }) => ({
  coverMedia: one(media, {
    fields: [projects.coverMediaId],
    references: [media.id],
    relationName: "projectCover",
  }),
  previewMedia: one(media, {
    fields: [projects.previewMediaId],
    references: [media.id],
    relationName: "projectPreview",
  }),
  blocks: many(projectBlocks),
}));

export const pagesRelations = relations(pages, ({ many }) => ({
  blocks: many(projectBlocks),
}));

export const projectBlocksRelations = relations(
  projectBlocks,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [projectBlocks.projectId],
      references: [projects.id],
    }),
    page: one(pages, {
      fields: [projectBlocks.pageId],
      references: [pages.id],
    }),
    parent: one(projectBlocks, {
      fields: [projectBlocks.parentBlockId],
      references: [projectBlocks.id],
      relationName: "blockChildren",
    }),
    children: many(projectBlocks, { relationName: "blockChildren" }),
    mediaItems: many(blockMedia),
  }),
);

export const blockMediaRelations = relations(blockMedia, ({ one }) => ({
  block: one(projectBlocks, {
    fields: [blockMedia.blockId],
    references: [projectBlocks.id],
  }),
  media: one(media, {
    fields: [blockMedia.mediaId],
    references: [media.id],
  }),
}));

export const mediaRelations = relations(media, ({ one, many }) => ({
  poster: one(media, {
    fields: [media.posterMediaId],
    references: [media.id],
    relationName: "mediaPoster",
  }),
  posterFor: many(media, { relationName: "mediaPoster" }),
  blockUsages: many(blockMedia),
  // Project cover and preview usage is queried separately; one media item may
  // be reused by several projects.
}));

export type AdminUser = typeof adminUsers.$inferSelect;
export type AdminSession = typeof adminSessions.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;
export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;
export type ProjectBlock = typeof projectBlocks.$inferSelect;
export type NewProjectBlock = typeof projectBlocks.$inferInsert;
export type BlockMedia = typeof blockMedia.$inferSelect;
export type NewBlockMedia = typeof blockMedia.$inferInsert;
