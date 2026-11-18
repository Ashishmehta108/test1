import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { cache } from "react";
import { redirect } from "next/navigation";
import { iso, one, q } from "./db";
import { randomToken } from "./ids";
import { clientIp } from "./request";

export const SESSION_COOKIE = "ot_session";
const SESSION_DAYS = 30;

export type User = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  active: boolean;
};

/**
 * In production the session cookie is SameSite=None so it is also sent when
 * Gmail (a different site) loads the tracking picture in *your* browser.
 * That lets the tracker recognise "this is the sender looking at their own email"
 * and not count it as an open.
 */
function cookieOptions() {
  const prod = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: prod,
    sameSite: prod ? ("none" as const) : ("lax" as const),
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

export async function createSession(userId: string) {
  const token = randomToken(40);
  await q(
    `INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)`,
    [token, userId, iso(SESSION_DAYS * 86_400_000)],
  );
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions());
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await q(`DELETE FROM sessions WHERE token = $1`, [token]);
  jar.delete(SESSION_COOKIE);
}

type UserWithIp = User & { last_ip: string | null; last_ip_at: Date | string | null };

export async function userForSessionToken(token: string | undefined): Promise<UserWithIp | undefined> {
  if (!token) return undefined;
  return one<UserWithIp>(
    `SELECT u.id, u.email, u.name, u.role, u.active, u.last_ip, u.last_ip_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = $1 AND s.expires_at > $2 AND u.active`,
    [token, iso()],
  );
}

/** Looked up once per request, even when the layout and the page both ask. */
export const getUser = cache(async (): Promise<User | undefined> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const found = await userForSessionToken(token);
  if (!found) return undefined;
  const { last_ip, last_ip_at, ...user } = found;

  // Remember the sender's internet address so their own views of an email
  // (from the same connection) are not counted as opens. Done after the page
  // is sent, and only when something actually changed.
  const ip = clientIp(await headers());
  const stale = !last_ip_at || new Date(last_ip_at).getTime() < Date.now() - 10 * 60_000;
  if (ip && (last_ip !== ip || stale)) {
    after(() =>
      q(`UPDATE users SET last_ip = $2, last_ip_at = $3 WHERE id = $1`, [user.id, ip, iso()]).catch((err) =>
        console.error("[tracker] could not save address", err),
      ),
    );
  }
  return user;
});

export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}
