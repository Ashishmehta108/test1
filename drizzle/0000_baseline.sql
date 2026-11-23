-- Baseline: the database as it was before Drizzle took over.
-- Safe to run twice. Databases that already have these tables skip it (see src/db/index.ts).
CREATE TABLE IF NOT EXISTS "click_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"email_id" text NOT NULL,
	"link_id" integer,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" text,
	"user_agent" text,
	"kind" text NOT NULL,
	"reason" text,
	CONSTRAINT "click_events_kind_check" CHECK ("click_events"."kind" in ('real','maybe','ignored'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "emails" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"token" text NOT NULL,
	"recipient_email" text NOT NULL,
	"recipient_name" text,
	"label" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"first_open_at" timestamp with time zone,
	"last_open_at" timestamp with time zone,
	"open_count" integer DEFAULT 0 NOT NULL,
	"maybe_count" integer DEFAULT 0 NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"share_token" text,
	CONSTRAINT "emails_token_unique" UNIQUE("token"),
	CONSTRAINT "emails_status_check" CHECK ("emails"."status" in ('draft','sent','maybe','opened','clicked'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "links" (
	"id" serial PRIMARY KEY NOT NULL,
	"email_id" text NOT NULL,
	"position" integer NOT NULL,
	"url" text NOT NULL,
	CONSTRAINT "links_email_id_position_key" UNIQUE("email_id","position")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "open_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"email_id" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" text,
	"user_agent" text,
	"kind" text NOT NULL,
	"reason" text,
	CONSTRAINT "open_events_kind_check" CHECK ("open_events"."kind" in ('real','maybe','ignored'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text,
	"role" text DEFAULT 'user' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"invite_token" text,
	"invite_expires" timestamp with time zone,
	"last_ip" text,
	"last_ip_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_invite_token_unique" UNIQUE("invite_token"),
	CONSTRAINT "users_role_check" CHECK ("users"."role" in ('admin','user'))
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "click_events" ADD CONSTRAINT "click_events_email_id_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "click_events" ADD CONSTRAINT "click_events_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "emails" ADD CONSTRAINT "emails_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "links" ADD CONSTRAINT "links_email_id_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "open_events" ADD CONSTRAINT "open_events_email_id_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "click_events_email_idx" ON "click_events" USING btree ("email_id","at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "emails_owner_idx" ON "emails" USING btree ("owner_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "emails_share_idx" ON "emails" USING btree ("share_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "open_events_email_idx" ON "open_events" USING btree ("email_id","at");