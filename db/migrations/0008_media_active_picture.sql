CREATE TYPE "public"."media_active_picture" AS ENUM('2.39', '2.00', '1.85');--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "active_picture" "media_active_picture";--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_active_picture_stored_check" CHECK ("media"."active_picture" IS NULL OR "media"."type" <> 'EXTERNAL_VIDEO');