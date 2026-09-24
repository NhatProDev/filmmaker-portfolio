-- ADR-0012: one current published snapshot per project and page, and the media
-- each snapshot references, so MEDIA_IN_USE protects what is live.
CREATE TABLE "page_publications" (
	"page_id" uuid PRIMARY KEY NOT NULL,
	"snapshot" jsonb NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_by" uuid
);
--> statement-breakpoint
CREATE TABLE "project_publications" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"snapshot" jsonb NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_by" uuid
);
--> statement-breakpoint
CREATE TABLE "publication_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"page_id" uuid,
	"media_id" uuid NOT NULL,
	CONSTRAINT "publication_media_single_owner_check" CHECK (("publication_media"."project_id" IS NOT NULL AND "publication_media"."page_id" IS NULL) OR ("publication_media"."project_id" IS NULL AND "publication_media"."page_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "page_publications" ADD CONSTRAINT "page_publications_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_publications" ADD CONSTRAINT "page_publications_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_publications" ADD CONSTRAINT "project_publications_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_publications" ADD CONSTRAINT "project_publications_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_media" ADD CONSTRAINT "publication_media_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."project_publications"("project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_media" ADD CONSTRAINT "publication_media_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."page_publications"("page_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_media" ADD CONSTRAINT "publication_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "publication_media_project_media_uidx" ON "publication_media" USING btree ("project_id","media_id");--> statement-breakpoint
CREATE UNIQUE INDEX "publication_media_page_media_uidx" ON "publication_media" USING btree ("page_id","media_id");--> statement-breakpoint
CREATE INDEX "publication_media_media_id_idx" ON "publication_media" USING btree ("media_id");