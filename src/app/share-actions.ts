"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { emails } from "@/db/schema";
import { requireUser, type User } from "@/lib/auth";
import { randomToken } from "@/lib/ids";

/** This email, as long as it's the person's own (an admin may touch anyone's). */
function emailOf(user: User, emailId: string) {
  return user.role === "admin" ? eq(emails.id, emailId) : and(eq(emails.id, emailId), eq(emails.ownerId, user.id));
}

async function setShareToken(emailId: string, token: ReturnType<typeof sql> | string | null) {
  const user = await requireUser();
  const db = await getDb();
  const [done] = await db.update(emails).set({ shareToken: token }).where(emailOf(user, emailId)).returning({ id: emails.id });
  if (!done) redirect("/");
  revalidatePath(`/emails/${emailId}`);
}

/** Turns on a private link for one email (keeps the existing link if one is already on). */
export async function enableShare(emailId: string) {
  await setShareToken(emailId, sql`coalesce(${emails.shareToken}, ${randomToken(32)})`);
}

/** Turns the link off. Anyone who has it sees "no longer available" from now on. */
export async function disableShare(emailId: string) {
  await setShareToken(emailId, null);
}

/** Makes a new link. The old one stops working straight away. */
export async function renewShare(emailId: string) {
  await setShareToken(emailId, randomToken(32));
}
