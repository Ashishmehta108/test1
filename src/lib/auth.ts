import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { one, q } from "./db";
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
    `INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, now() + ($3 || ' days')::interval)`,
    [token, userId, String(SESSION_DAYS)],
  );
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions());
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await q(`DELETE FROM sessions WHERE token = $1`, [token]);
  jar.delete(SESSION_COOKIE);
}

export async function userForSessionToken(token: string | undefined): Promise<User | undefined> {
  if (!token) return undefined;
  return one<User>(
    `SELECT u.id, u.email, u.name, u.role, u.active
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = $1 AND s.expires_at > now() AND u.active`,
    [token],
  );
}

export async function getUser(): Promise<User | undefined> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = await userForSessionToken(token);
  if (user) {
    // Remember the sender's internet address so their own views of an email
    // (from the same connection) are not counted as opens.
    const ip = clientIp(await headers());
    if (ip) {
      await q(
        `UPDATE users SET last_ip = $2, last_ip_at = now()
          WHERE id = $1 AND (last_ip IS DISTINCT FROM $2 OR last_ip_at < now() - interval '10 minutes')`,
        [user.id, ip],
      );
    }
  }
  return user;
}

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
