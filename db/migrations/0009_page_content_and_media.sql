-- ADR-0017: structured page content and page media slots, and the keyed
-- pages that use them. Additive: HOME's content defaults to '{}' and its
-- composition, snapshot and public page are unchanged. The seeds are
-- idempotent and never overwrite an existing row.
CREATE TABLE "page_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"slot" varchar(50) NOT NULL,
	"media_id" uuid NOT NULL,
	"alt_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "page_media_slot_format_check" CHECK ("page_media"."slot" ~ '^[a-z][a-zA-Z0-9]*$')
);
--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "content" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "page_media" ADD CONSTRAINT "page_media_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_media" ADD CONSTRAINT "page_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "page_media_page_slot_uidx" ON "page_media" USING btree ("page_id","slot");--> statement-breakpoint
CREATE INDEX "page_media_media_id_idx" ON "page_media" USING btree ("media_id");--> statement-breakpoint
INSERT INTO "pages" ("key", "title") VALUES ('ABOUT', 'About me'), ('CONTACT', 'Contact'), ('SITE', 'Site settings') ON CONFLICT ("key") DO NOTHING;
