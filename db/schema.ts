import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
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

export type ProjectCredit = {
  role: string;
  name: string;
};

export type BlockConfig = Record<string, unknown>;
export type BlockMediaConfig = Record<string, unknown>;

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

    altText: text("alt_text"),

    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("media_type_idx").on(table.type),
    index("media_status_idx").on(table.status),
    index("media_created_at_idx").on(table.createdAt),
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

    credits: jsonb("credits").$type<ProjectCredit[]>().default([]).notNull(),

    status: projectStatusEnum("status").default("DRAFT").notNull(),
    visibility: projectVisibilityEnum("visibility").default("PUBLIC").notNull(),
    passwordHash: text("password_hash"),

    coverMediaId: uuid("cover_media_id").references(() => media.id, {
      onDelete: "set null",
    }),

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

export const projectBlocks = pgTable(
  "project_blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    type: blockTypeEnum("type").notNull(),
    position: integer("position").notNull(),
    config: jsonb("config")
      .$type<BlockConfig>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("project_blocks_project_id_idx").on(table.projectId),
    index("project_blocks_project_position_idx").on(
      table.projectId,
      table.position,
    ),
    check(
      "project_blocks_position_nonnegative_check",
      sql`${table.position} >= 0`,
    ),
  ],
);

export const blockMedia = pgTable(
  "block_media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    blockId: uuid("block_id")
      .notNull()
      .references(() => projectBlocks.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    config: jsonb("config")
      .$type<BlockMediaConfig>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("block_media_block_id_idx").on(table.blockId),
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

// Relations are declared after all tables to avoid declaration-order issues.
export const projectsRelations = relations(projects, ({ one, many }) => ({
  coverMedia: one(media, {
    fields: [projects.coverMediaId],
    references: [media.id],
  }),
  blocks: many(projectBlocks),
}));

export const projectBlocksRelations = relations(
  projectBlocks,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [projectBlocks.projectId],
      references: [projects.id],
    }),
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

export const mediaRelations = relations(media, ({ many }) => ({
  blockUsages: many(blockMedia),
  // Project cover usage is intentionally queried separately; one media item may
  // be reused as the cover for multiple projects.
}));

export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;
export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectBlock = typeof projectBlocks.$inferSelect;
export type NewProjectBlock = typeof projectBlocks.$inferInsert;
export type BlockMedia = typeof blockMedia.$inferSelect;
export type NewBlockMedia = typeof blockMedia.$inferInsert;
