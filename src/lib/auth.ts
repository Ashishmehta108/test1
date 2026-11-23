import { and, eq, gt, lt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { sessions, users, type Role } from "@/db/schema";
import { randomToken } from "./ids";
import { clientIp } from "./request";

export const SESSION_COOKIE = "ot_session";
const SESSION_DAYS = 30;

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
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
  const db = await getDb();
  const token = randomToken(40);
  await db.insert(sessions).values({ token, userId, expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000) });
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions());

  // Tidy up this person's old, expired sessions once the page has been sent.
  after(() =>
    db
      .delete(sessions)
      .where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())))
      .then(() => undefined, (err) => console.error("[tracker] could not clear old sessions", err)),
  );
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await (await getDb()).delete(sessions).where(eq(sessions.token, token));
  jar.delete(SESSION_COOKIE);
}

type UserWithIp = User & { lastIp: string | null; lastIpAt: Date | null };

export async function userForSessionToken(token: string | undefined): Promise<UserWithIp | undefined> {
  if (!token) return undefined;
  const db = await getDb();
  const [found] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      active: users.active,
      lastIp: users.lastIp,
      lastIpAt: users.lastIpAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date()), eq(users.active, true)))
    .limit(1);
  return found;
}

/** Looked up once per request, even when the layout and the page both ask. */
export const getUser = cache(async (): Promise<User | undefined> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const found = await userForSessionToken(token);
  if (!found) return undefined;
  const { lastIp, lastIpAt, ...user } = found;

  // Remember the sender's internet address so their own views of an email
  // (from the same connection) are not counted as opens. Done after the page
  // is sent, and only when something actually changed.
  const ip = clientIp(await headers());
  const stale = !lastIpAt || lastIpAt.getTime() < Date.now() - 10 * 60_000;
  if (ip && (lastIp !== ip || stale)) {
    after(async () => {
      try {
        await (await getDb()).update(users).set({ lastIp: ip, lastIpAt: new Date() }).where(eq(users.id, user.id));
      } catch (err) {
        console.error("[tracker] could not save address", err);
      }
    });
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
