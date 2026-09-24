-- ADR-0019: albums, their ordered images and their published snapshots.
-- Additive. publication_media gains album_id, and its single-owner check is
-- replaced by the three-owner form in this same transaction; every existing
-- row names exactly one project or page, so it already satisfies the new one.
CREATE TABLE "album_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"album_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"alt_text" text,
	"caption" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "album_media_position_nonnegative_check" CHECK ("album_media"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "album_publications" (
	"album_id" uuid PRIMARY KEY NOT NULL,
	"snapshot" jsonb NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_by" uuid
);
--> statement-breakpoint
CREATE TABLE "albums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(200) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"collection" varchar(120),
	"status" "project_status" DEFAULT 'DRAFT' NOT NULL,
	"cover_media_id" uuid,
	"project_id" uuid,
	"display_position" integer DEFAULT 0 NOT NULL,
	"seo_title" varchar(200),
	"seo_description" varchar(500),
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "albums_display_position_nonnegative_check" CHECK ("albums"."display_position" >= 0)
);
--> statement-breakpoint
ALTER TABLE "publication_media" DROP CONSTRAINT "publication_media_single_owner_check";--> statement-breakpoint
ALTER TABLE "publication_media" ADD COLUMN "album_id" uuid;--> statement-breakpoint
ALTER TABLE "album_media" ADD CONSTRAINT "album_media_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_media" ADD CONSTRAINT "album_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_publications" ADD CONSTRAINT "album_publications_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_publications" ADD CONSTRAINT "album_publications_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "albums" ADD CONSTRAINT "albums_cover_media_id_fkey" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "albums" ADD CONSTRAINT "albums_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "album_media_album_position_idx" ON "album_media" USING btree ("album_id","position");--> statement-breakpoint
CREATE INDEX "album_media_media_id_idx" ON "album_media" USING btree ("media_id");--> statement-breakpoint
CREATE UNIQUE INDEX "albums_slug_uidx" ON "albums" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "albums_public_order_idx" ON "albums" USING btree ("status","deleted_at","display_position");--> statement-breakpoint
CREATE INDEX "albums_cover_media_id_idx" ON "albums" USING btree ("cover_media_id");--> statement-breakpoint
ALTER TABLE "publication_media" ADD CONSTRAINT "publication_media_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."album_publications"("album_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "publication_media_album_media_uidx" ON "publication_media" USING btree ("album_id","media_id");--> statement-breakpoint
ALTER TABLE "publication_media" ADD CONSTRAINT "publication_media_single_owner_check" CHECK (num_nonnulls("publication_media"."project_id", "publication_media"."page_id", "publication_media"."album_id") = 1);