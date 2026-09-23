-- Admin sessions (revocable, token stored as SHA-256) and fixed-window rate
-- limits for admin login and private-project passwords (CLAUDE.md §11, §16).
CREATE TABLE "admin_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"user_agent" varchar(400),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "admin_sessions_token_hash_format_check" CHECK ("admin_sessions"."token_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" varchar(300) PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	CONSTRAINT "rate_limits_count_positive_check" CHECK ("rate_limits"."count" > 0)
);
--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_sessions_token_hash_uidx" ON "admin_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "admin_sessions_admin_user_id_idx" ON "admin_sessions" USING btree ("admin_user_id");