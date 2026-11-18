"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSession, destroySession, requireAdmin, requireUser, type User } from "@/lib/auth";
import { iso, one, q } from "@/lib/db";
import { isEmail, normaliseUrl } from "@/lib/format";
import { newId, randomToken } from "@/lib/ids";
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

async function emailForUser(user: User, emailId: string) {
  const email = await one<{ id: string; owner_id: string }>(`SELECT id, owner_id FROM emails WHERE id = $1`, [
    emailId,
  ]);
  if (!email || (email.owner_id !== user.id && user.role !== "admin")) redirect("/");
  return email;
}

/* ---------- Signing in ---------- */

export async function login(form: FormData) {
  const email = text(form, "email").toLowerCase();
  const password = text(form, "password");
  const user = await one<{ id: string; password_hash: string | null; active: boolean }>(
    `SELECT id, password_hash, active FROM users WHERE email = $1`,
    [email],
  );
  const ok = user?.password_hash && user.active && (await bcrypt.compare(password, user.password_hash));
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

  const user = await one<{ id: string }>(
    `UPDATE users SET password_hash = $2, invite_token = NULL, invite_expires = NULL
      WHERE invite_token = $1 AND invite_expires > $3 AND active
      RETURNING id`,
    [token, await bcrypt.hash(password, 10), iso()],
  );
  if (!user) back(path, { error: "expired" });
  await createSession(user!.id);
  redirect("/?welcome=1");
}

export async function changePassword(form: FormData) {
  const user = await requireUser();
  const current = text(form, "current");
  const next = text(form, "password");
  const row = await one<{ password_hash: string }>(`SELECT password_hash FROM users WHERE id = $1`, [user.id]);
  if (!row || !(await bcrypt.compare(current, row.password_hash))) back("/account", { error: "current" });
  if (next.length < 8) back("/account", { error: "short" });
  await q(`UPDATE users SET password_hash = $2 WHERE id = $1`, [user.id, await bcrypt.hash(next, 10)]);
  back("/account", { ok: "password" });
}

/* ---------- Tracked emails ---------- */

export async function createEmail(form: FormData) {
  const user = await requireUser();
  const recipient = text(form, "recipient").toLowerCase();
  const name = text(form, "name");
  const label = text(form, "label");
  const rawLinks = text(form, "links");

  if (!isEmail(recipient)) back("/new", { error: "email", name, label, links: rawLinks });

  const links: string[] = [];
  for (const line of rawLinks.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const url = normaliseUrl(line);
    if (!url) back("/new", { error: "link", recipient, name, label, links: rawLinks });
    if (!links.includes(url!)) links.push(url!);
  }

  const id = newId();
  await q(
    `INSERT INTO emails (id, owner_id, token, recipient_email, recipient_name, label)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, user.id, randomToken(22), recipient, name || null, label || null],
  );
  for (const [i, url] of links.entries()) {
    await q(`INSERT INTO links (email_id, position, url) VALUES ($1,$2,$3)`, [id, i + 1, url]);
  }
  redirect(`/emails/${id}`);
}

export async function markSent(emailId: string) {
  const user = await requireUser();
  await emailForUser(user, emailId);
  await q(`UPDATE emails SET sent_at = $2 WHERE id = $1 AND sent_at IS NULL`, [emailId, iso()]);
  await recompute(emailId);
  revalidatePath(`/emails/${emailId}`);
}

export async function markNotSent(emailId: string) {
  const user = await requireUser();
  await emailForUser(user, emailId);
  await q(`UPDATE emails SET sent_at = NULL WHERE id = $1`, [emailId]);
  await recompute(emailId);
  revalidatePath(`/emails/${emailId}`);
}

export async function deleteEmail(emailId: string) {
  const user = await requireUser();
  await emailForUser(user, emailId);
  await q(`DELETE FROM emails WHERE id = $1`, [emailId]);
  redirect("/?deleted=1");
}

/** "That was me" — the sender says an open or click wasn't the recipient. */
export async function ignoreEvent(emailId: string, type: "open" | "click", eventId: string) {
  const user = await requireUser();
  await emailForUser(user, emailId);
  const table = type === "open" ? "open_events" : "click_events";
  await q(`UPDATE ${table} SET kind = 'ignored', reason = $3 WHERE id = $1 AND email_id = $2`, [
    eventId,
    emailId,
    `Marked as not them by ${user.name}`,
  ]);
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

  const exists = await one(`SELECT 1 FROM users WHERE email = $1`, [email]);
  if (exists) back("/team", { error: "exists", name, email });

  const id = newId();
  await q(
    `INSERT INTO users (id, email, name, role, invite_token, invite_expires)
     VALUES ($1,$2,$3,'user',$4,$5)`,
    [id, email, name, randomToken(32), iso(INVITE_HOURS * 3_600_000)],
  );
  back("/team", { invited: id });
}

export async function renewInvite(userId: string) {
  await requireAdmin();
  await q(
    `UPDATE users SET invite_token = $2, invite_expires = $3
      WHERE id = $1 AND password_hash IS NULL`,
    [userId, randomToken(32), iso(INVITE_HOURS * 3_600_000)],
  );
  back("/team", { invited: userId });
}

export async function setActive(userId: string, active: boolean) {
  const admin = await requireAdmin();
  if (userId === admin.id) back("/team", { error: "self" });
  await q(`UPDATE users SET active = $2 WHERE id = $1`, [userId, active]);
  if (!active) await q(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
  revalidatePath("/team");
}
