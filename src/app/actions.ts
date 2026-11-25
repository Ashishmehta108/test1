"use server";

import bcrypt from "bcryptjs";
import { and, eq, exists, gt, isNull, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSession, destroySession, requireAdmin, requireUser, type User } from "@/lib/auth";
import { at, getDb } from "@/db";
import { clickEvents, emails, links, openEvents, sessions, users } from "@/db/schema";
import { isEmail } from "@/lib/format";
import { newId, randomToken } from "@/lib/ids";
import { linksIn, MAX_NOTES, subjectOf } from "@/lib/notes";
import { recompute } from "@/lib/track";

const INVITE_HOURS = 72;

function text(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function back(path: string, params: Record<string, string>): never {
  const qs = new URLSearchParams(params).toString();
  redirect(qs ? `${path}?${qs}` : path);
}

/** This email, as long as it's the person's own (an admin may touch anyone's). */
function emailOf(user: User, emailId: string) {
  return user.role === "admin" ? eq(emails.id, emailId) : and(eq(emails.id, emailId), eq(emails.ownerId, user.id));
}

/* ---------- Signing in ---------- */

export async function login(form: FormData) {
  const email = text(form, "email").toLowerCase();
  const password = text(form, "password");
  const db = await getDb();
  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash, active: users.active })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const ok = user?.passwordHash && user.active && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) back("/login", { error: "wrong", email });
  await createSession(user!.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function acceptInvite(form: FormData) {
  const token = text(form, "token");
  const password = text(form, "password");
  const confirm = text(form, "confirm");
  const path = `/invite/${encodeURIComponent(token)}`;

  if (password.length < 8) back(path, { error: "short" });
  if (password !== confirm) back(path, { error: "match" });

  const db = await getDb();
  const [user] = await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(password, 10), inviteToken: null, inviteExpires: null })
    .where(and(eq(users.inviteToken, token), gt(users.inviteExpires, new Date()), eq(users.active, true)))
    .returning({ id: users.id });
  if (!user) back(path, { error: "expired" });
  await createSession(user.id);
  redirect("/?welcome=1");
}

export async function changePassword(form: FormData) {
  const user = await requireUser();
  const current = text(form, "current");
  const next = text(form, "password");
  const db = await getDb();
  const [row] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1);
  if (!row?.passwordHash || !(await bcrypt.compare(current, row.passwordHash))) back("/account", { error: "current" });
  if (next.length < 8) back("/account", { error: "short" });
  await db.update(users).set({ passwordHash: await bcrypt.hash(next, 10) }).where(eq(users.id, user.id));
  back("/account", { ok: "password" });
}

/* ---------- Tracked emails ---------- */

export type TrackState = { errors?: { recipient?: string; notes?: string }; message?: string };

/**
 * Saves a new tracked email, then goes to its page with the steps to follow.
 * Problems come back to the form (nothing typed is lost) instead of opening another page.
 */
export async function createEmail(_prev: TrackState, form: FormData): Promise<TrackState> {
  const user = await requireUser();
  const recipient = text(form, "recipient").toLowerCase();
  const notes = text(form, "notes");

  const errors: NonNullable<TrackState["errors"]> = {};
  if (!recipient) errors.recipient = "Required";
  else if (!isEmail(recipient)) errors.recipient = "That email address doesn't look right. It should look like priya@acme.com.";
  if (notes.length > MAX_NOTES) errors.notes = `Keep notes under ${MAX_NOTES.toLocaleString("en")} characters.`;
  if (errors.recipient || errors.notes) return { errors };

  const id = newId();
  const urls = linksIn(notes);
  try {
    const db = await getDb();
    // The email and all of its links are saved in a single trip to the database.
    // (The list of links goes over as one piece of text and is split up by the database.)
    await db.execute(sql`
      WITH saved AS (
        INSERT INTO emails (id, owner_id, token, recipient_email, label, notes)
        VALUES (${id}, ${user.id}, ${randomToken(22)}, ${recipient}, ${subjectOf(notes) || null}, ${notes || null})
      )
      INSERT INTO links (email_id, position, url)
      SELECT ${id}::text, CAST(t.ord AS integer), t.url
        FROM jsonb_array_elements_text(${JSON.stringify(urls)}::jsonb) WITH ORDINALITY AS t(url, ord)`);
  } catch (err) {
    console.error("[tracker] could not save email", err);
    return { message: "Couldn't save just now. Nothing was lost, so please try again." };
  }
  redirect(`/emails/${id}`);
}

export async function markSent(emailId: string) {
  const user = await requireUser();
  const db = await getDb();
  // The status is worked out from the totals already stored, so this is one trip.
  const [done] = await db
    .update(emails)
    .set({
      sentAt: sql`coalesce(${emails.sentAt}, ${at(new Date())})`,
      status: sql`CASE WHEN ${emails.clickCount} > 0 THEN 'clicked' WHEN ${emails.openCount} > 0 THEN 'opened' WHEN ${emails.maybeCount} > 0 THEN 'maybe' ELSE 'sent' END`,
    })
    .where(emailOf(user, emailId))
    .returning({ id: emails.id });
  if (!done) redirect("/");
  revalidatePath(`/emails/${emailId}`);
}

export async function markNotSent(emailId: string) {
  const user = await requireUser();
  const db = await getDb();
  const [done] = await db
    .update(emails)
    .set({ sentAt: null, status: "draft" })
    .where(emailOf(user, emailId))
    .returning({ id: emails.id });
  if (!done) redirect("/");
  revalidatePath(`/emails/${emailId}`);
}

export async function deleteEmail(emailId: string) {
  const user = await requireUser();
  const db = await getDb();
  const [done] = await db.delete(emails).where(emailOf(user, emailId)).returning({ id: emails.id });
  redirect(done ? "/?deleted=1" : "/");
}

/** "That was me" — the sender says an open or click wasn't the recipient. */
export async function ignoreEvent(emailId: string, type: "open" | "click", eventId: number) {
  const user = await requireUser();
  const db = await getDb();
  const change = { kind: "ignored" as const, reason: `Marked as not them by ${user.name}` };
  // The event only changes when its email is one this person is allowed to touch.
  const mine = exists(db.select({ one: sql`1` }).from(emails).where(emailOf(user, emailId)));
  const [done] =
    type === "open"
      ? await db
          .update(openEvents)
          .set(change)
          .where(and(eq(openEvents.id, eventId), eq(openEvents.emailId, emailId), mine))
          .returning({ id: openEvents.id })
      : await db
          .update(clickEvents)
          .set(change)
          .where(and(eq(clickEvents.id, eventId), eq(clickEvents.emailId, emailId), mine))
          .returning({ id: clickEvents.id });
  if (!done) redirect("/");
  await recompute(emailId);
  revalidatePath(`/emails/${emailId}`);
}

/* ---------- Team (admin) ---------- */

export async function inviteUser(form: FormData) {
  await requireAdmin();
  const name = text(form, "name");
  const email = text(form, "email").toLowerCase();
  if (!name) back("/team", { error: "name", email });
  if (!isEmail(email)) back("/team", { error: "email", name });

  const db = await getDb();
  const id = newId();
  // The email address is unique in the database, so a duplicate simply inserts nothing.
  const [created] = await db
    .insert(users)
    .values({ id, email, name, role: "user", inviteToken: randomToken(32), inviteExpires: new Date(Date.now() + INVITE_HOURS * 3_600_000) })
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id });
  if (!created) back("/team", { error: "exists", name, email });
  back("/team", { invited: id });
}

export type EditMemberState = {
  error?: string;
  field?: "name" | "email";
  /** What was typed, so it is still there after a problem. */
  values?: { name: string; email: string };
  saved?: number;
};

const EMAIL_TAKEN = "Someone else on the team already uses that email.";

/** The admin changes someone's name or the email they sign in with. */
export async function updateMember(userId: string, _prev: EditMemberState, form: FormData): Promise<EditMemberState> {
  await requireAdmin();
  const name = text(form, "name").slice(0, 80);
  const email = text(form, "email").toLowerCase();
  const values = { name, email };
  if (!name) return { error: "Add their name so you can tell people apart.", field: "name", values };
  if (!isEmail(email)) return { error: "That email address doesn't look right. It should look like riya@acme.com.", field: "email", values };

  try {
    const db = await getDb();
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email), ne(users.id, userId)))
      .limit(1);
    if (taken) return { error: EMAIL_TAKEN, field: "email", values };

    const [done] = await db.update(users).set({ name, email }).where(eq(users.id, userId)).returning({ id: users.id });
    if (!done) return { error: "That person is no longer on the team.", values };
  } catch (err) {
    // Two saves at the same moment: the database itself refuses the second use of an email.
    const code = (err as { code?: string; cause?: { code?: string } })?.cause?.code ?? (err as { code?: string })?.code;
    if (code === "23505") return { error: EMAIL_TAKEN, field: "email", values };
    console.error("[tracker] could not update person", err);
    return { error: "Couldn't save just now. Please try again.", values };
  }
  revalidatePath("/", "layout");
  return { saved: Date.now() };
}

export async function renewInvite(userId: string) {
  await requireAdmin();
  const db = await getDb();
  await db
    .update(users)
    .set({ inviteToken: randomToken(32), inviteExpires: new Date(Date.now() + INVITE_HOURS * 3_600_000) })
    .where(and(eq(users.id, userId), isNull(users.passwordHash)));
  back("/team", { invited: userId });
}

export async function setActive(userId: string, active: boolean) {
  const admin = await requireAdmin();
  if (userId === admin.id) back("/team", { error: "self" });
  const db = await getDb();
  await db.update(users).set({ active }).where(eq(users.id, userId));
  if (!active) await db.delete(sessions).where(eq(sessions.userId, userId));
  revalidatePath("/team");
}

/** Removes a person for good, together with the emails they tracked. Admins only, never yourself. */
export async function deleteUser(userId: string) {
  const admin = await requireAdmin();
  if (userId === admin.id) back("/team", { error: "self" });
  const db = await getDb();
  // Their emails go first (opens, clicks and links go with each email), then the person.
  // One statement, so it either all happens or none of it does.
  await db.execute(sql`
    WITH gone AS (DELETE FROM emails WHERE owner_id = ${userId})
    DELETE FROM users WHERE id = ${userId}`);
  back("/team", { removed: "1" });
}
