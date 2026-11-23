-- Adds private notes to a tracked email. Safe to run twice; nothing existing changes.
ALTER TABLE "emails" ADD COLUMN IF NOT EXISTS "notes" text;