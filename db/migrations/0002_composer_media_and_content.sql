CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(50) NOT NULL,
	"title" varchar(200) NOT NULL,
	"seo_title" varchar(200),
	"seo_description" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pages_key_format_check" CHECK ("pages"."key" ~ '^[A-Z][A-Z0-9_]*$')
);
--> statement-breakpoint
ALTER TABLE "project_blocks" ALTER COLUMN "project_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "block_media" ADD COLUMN "alt_text" text;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "checksum_sha256" varchar(64);--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "poster_media_id" uuid;--> statement-breakpoint
ALTER TABLE "project_blocks" ADD COLUMN "page_id" uuid;--> statement-breakpoint
ALTER TABLE "project_blocks" ADD COLUMN "parent_block_id" uuid;--> statement-breakpoint
ALTER TABLE "project_blocks" ADD COLUMN "is_hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "project_blocks" ADD COLUMN "content" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "role" varchar(200);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "runtime" varchar(100);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "preview_media_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "pages_key_uidx" ON "pages" USING btree ("key");--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_poster_media_id_fkey" FOREIGN KEY ("poster_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_blocks" ADD CONSTRAINT "project_blocks_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_blocks" ADD CONSTRAINT "project_blocks_parent_block_id_fkey" FOREIGN KEY ("parent_block_id") REFERENCES "public"."project_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_preview_media_id_fkey" FOREIGN KEY ("preview_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_poster_media_id_idx" ON "media" USING btree ("poster_media_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_storage_identity_uidx" ON "media" USING btree ("storage_provider","storage_key") WHERE "media"."storage_key" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "media_checksum_active_uidx" ON "media" USING btree ("checksum_sha256") WHERE "media"."checksum_sha256" IS NOT NULL AND "media"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "project_blocks_page_position_idx" ON "project_blocks" USING btree ("page_id","position");--> statement-breakpoint
CREATE INDEX "project_blocks_parent_position_idx" ON "project_blocks" USING btree ("parent_block_id","position");--> statement-breakpoint
CREATE INDEX "projects_cover_media_id_idx" ON "projects" USING btree ("cover_media_id");--> statement-breakpoint
CREATE INDEX "projects_preview_media_id_idx" ON "projects" USING btree ("preview_media_id");--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_checksum_format_check" CHECK ("media"."checksum_sha256" IS NULL OR "media"."checksum_sha256" ~ '^[0-9a-f]{64}$');--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_poster_not_self_check" CHECK ("media"."poster_media_id" IS NULL OR "media"."poster_media_id" <> "media"."id");--> statement-breakpoint
ALTER TABLE "project_blocks" ADD CONSTRAINT "project_blocks_single_owner_check" CHECK (("project_blocks"."project_id" IS NOT NULL AND "project_blocks"."page_id" IS NULL AND "project_blocks"."parent_block_id" IS NULL)
        OR ("project_blocks"."project_id" IS NULL AND "project_blocks"."page_id" IS NOT NULL AND "project_blocks"."parent_block_id" IS NULL)
        OR ("project_blocks"."project_id" IS NULL AND "project_blocks"."page_id" IS NULL AND "project_blocks"."parent_block_id" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "project_blocks" ADD CONSTRAINT "project_blocks_leaf_child_check" CHECK ("project_blocks"."parent_block_id" IS NULL OR "project_blocks"."type" IN ('HERO', 'TEXT', 'IMAGE', 'VIDEO', 'SPACER'));--> statement-breakpoint
ALTER TABLE "project_blocks" ADD CONSTRAINT "project_blocks_parent_not_self_check" CHECK ("project_blocks"."parent_block_id" IS NULL OR "project_blocks"."parent_block_id" <> "project_blocks"."id");