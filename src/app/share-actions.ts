"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { randomToken } from "@/lib/ids";

/** Turns on a private link for one email (keeps the existing link if one is already on). */
export async function enableShare(emailId: string) {
  const user = await requireUser();
  const done = await one(
    `UPDATE emails SET share_token = COALESCE(share_token, $2)
      WHERE id = $1 AND (owner_id = $3 OR $4) RETURNING id`,
    [emailId, randomToken(32), user.id, user.role === "admin"],
  );
  if (!done) redirect("/");
  revalidatePath(`/emails/${emailId}`);
}

/** Turns the link off. Anyone who has it sees "no longer available" from now on. */
export async function disableShare(emailId: string) {
  const user = await requireUser();
  const done = await one(
    `UPDATE emails SET share_token = NULL
      WHERE id = $1 AND (owner_id = $2 OR $3) RETURNING id`,
    [emailId, user.id, user.role === "admin"],
  );
  if (!done) redirect("/");
  revalidatePath(`/emails/${emailId}`);
}

/** Makes a new link. The old one stops working straight away. */
export async function renewShare(emailId: string) {
  const user = await requireUser();
  const done = await one(
    `UPDATE emails SET share_token = $2
      WHERE id = $1 AND (owner_id = $3 OR $4) RETURNING id`,
    [emailId, randomToken(32), user.id, user.role === "admin"],
  );
  if (!done) redirect("/");
  revalidatePath(`/emails/${emailId}`);
}
