-- Speed and tidy-up. Safe to run twice.
--  * Indexes now match the questions the app really asks (a person's emails newest first,
--    counts per status, an email's opens and clicks, a link's clicks, a person's sessions).
--  * Removes three columns nothing ever read: the IP address saved with every open and click,
--    and when a sign-in session was created. (This deletes those stored values.)
-- Databases from before the "share a link" feature are missing this column.
ALTER TABLE "emails" ADD COLUMN IF NOT EXISTS "share_token" text;--> statement-breakpoint
DROP INDEX IF EXISTS "click_events_email_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "emails_owner_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "open_events_email_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "emails_share_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "click_events_email_kind_idx" ON "click_events" USING btree ("email_id","kind","at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "click_events_link_idx" ON "click_events" USING btree ("link_id","kind");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "emails_owner_recent_idx" ON "emails" USING btree ("owner_id",coalesce("sent_at", "created_at") desc);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "emails_owner_status_idx" ON "emails" USING btree ("owner_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "open_events_email_kind_idx" ON "open_events" USING btree ("email_id","kind","at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "emails_share_idx" ON "emails" USING btree ("share_token") WHERE "emails"."share_token" is not null;--> statement-breakpoint
ALTER TABLE "click_events" DROP COLUMN IF EXISTS "ip";--> statement-breakpoint
ALTER TABLE "open_events" DROP COLUMN IF EXISTS "ip";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN IF EXISTS "created_at";