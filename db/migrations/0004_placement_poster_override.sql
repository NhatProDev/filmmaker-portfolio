-- ADR-0015: a placement may override its video asset's default poster.
-- Additive: NULL inherits the default. RESTRICT keeps a used poster undeletable.
ALTER TABLE "block_media" ADD COLUMN "poster_media_id" uuid;--> statement-breakpoint
ALTER TABLE "block_media" ADD CONSTRAINT "block_media_poster_media_id_fkey" FOREIGN KEY ("poster_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "block_media_poster_media_id_idx" ON "block_media" USING btree ("poster_media_id");