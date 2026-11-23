import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { clickEvents, emails, links, openEvents, users, type EventKind } from "@/db/schema";
import { userForSessionToken } from "./auth";

export type Hit = {
  ip: string | null;
  userAgent: string;
  sessionToken: string | undefined;
};

/** What we need to know about an email to decide whether a hit is a real open. */
export type EmailContext = {
  id: string;
  sentAt: Date | null;
  ownerLastIp: string | null;
  ownerLastIpAt: Date | null;
};

export type FoundLink = EmailContext & { linkId: number; url: string };

/** Transparent 1×1 GIF (42 bytes). */
export const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

const SCANNER_WINDOW_SECONDS = 10;
const SAME_CONNECTION_HOURS = 24;

const contextColumns = {
  id: emails.id,
  sentAt: emails.sentAt,
  ownerLastIp: users.lastIp,
  ownerLastIpAt: users.lastIpAt,
};

async function findEmailByToken(token: string): Promise<EmailContext | undefined> {
  const db = await getDb();
  const [row] = await db
    .select(contextColumns)
    .from(emails)
    .innerJoin(users, eq(users.id, emails.ownerId))
    .where(eq(emails.token, token))
    .limit(1);
  return row;
}

/** Finds a tracked link and everything needed to record the click, in one question to the database. */
export async function findLink(token: string, position: number): Promise<FoundLink | undefined> {
  const db = await getDb();
  const [row] = await db
    .select({ ...contextColumns, linkId: links.id, url: links.url })
    .from(emails)
    .innerJoin(users, eq(users.id, emails.ownerId))
    .innerJoin(links, eq(links.emailId, emails.id))
    .where(and(eq(emails.token, token), eq(links.position, position)))
    .limit(1);
  return row;
}

/**
 * Apple Mail Privacy Protection downloads every picture automatically, from
 * Apple's own servers, with a bare "Mozilla/5.0" user agent. We can't tell if a
 * person actually read it, so it's recorded as "maybe".
 */
function looksLikeApplePrefetch(ip: string | null, ua: string) {
  return ua.trim() === "Mozilla/5.0" || (ip?.startsWith("17.") ?? false);
}

function classify(
  email: EmailContext,
  viewerName: string | undefined,
  hit: Hit,
  type: "open" | "click",
): { kind: EventKind; reason: string } {
  if (!email.sentAt) {
    return { kind: "ignored", reason: "Before it was marked as sent (your own preview)" };
  }

  if (viewerName) {
    return { kind: "ignored", reason: `Viewed by ${viewerName}, who is signed in to the tracker` };
  }

  if (
    hit.ip &&
    email.ownerLastIp === hit.ip &&
    email.ownerLastIpAt &&
    Date.now() - email.ownerLastIpAt.getTime() < SAME_CONNECTION_HOURS * 3600_000
  ) {
    return { kind: "ignored", reason: "Same internet connection as the sender" };
  }

  const secondsSinceSent = (Date.now() - email.sentAt.getTime()) / 1000;
  if (secondsSinceSent < SCANNER_WINDOW_SECONDS) {
    return { kind: "maybe", reason: "Seconds after sending, probably a security scanner" };
  }

  if (type === "open" && looksLikeApplePrefetch(hit.ip, hit.userAgent)) {
    return { kind: "maybe", reason: "Apple Mail loads pictures automatically" };
  }

  return { kind: "real", reason: "" };
}

async function viewerName(hit: Hit): Promise<string | undefined> {
  return (await userForSessionToken(hit.sessionToken))?.name;
}

export async function recordOpen(token: string, hit: Hit) {
  // The two lookups don't depend on each other, so they go out together.
  const [email, viewer] = await Promise.all([findEmailByToken(token), viewerName(hit)]);
  if (!email) return;
  const { kind, reason } = classify(email, viewer, hit, "open");
  await saveOpen(email.id, hit, kind, reason);
}

export async function recordClick(target: FoundLink, hit: Hit) {
  const { kind, reason } = classify(target, await viewerName(hit), hit, "click");
  await saveClick(target, hit, kind, reason);
}

/**
 * Saves the open and updates the email's totals in one trip to the database.
 * The totals are added to inside the database, so two opens landing at the same
 * moment are both counted. (Corrections use `recompute`, which rebuilds them.)
 */
async function saveOpen(emailId: string, hit: Hit, kind: EventKind, reason: string) {
  const db = await getDb();
  const userAgent = hit.userAgent.slice(0, 500) || null;
  if (kind === "ignored") {
    await db.insert(openEvents).values({ emailId, userAgent, kind, reason: reason || null });
    return;
  }
  const totals =
    kind === "real"
      ? sql`open_count = open_count + 1,
            first_open_at = LEAST(first_open_at, now()),
            last_open_at = GREATEST(last_open_at, now()),
            status = CASE WHEN sent_at IS NULL THEN 'draft' WHEN click_count > 0 THEN 'clicked' ELSE 'opened' END`
      : sql`maybe_count = maybe_count + 1,
            status = CASE WHEN sent_at IS NULL THEN 'draft' WHEN click_count > 0 THEN 'clicked'
                          WHEN open_count > 0 THEN 'opened' ELSE 'maybe' END`;
  await db.execute(sql`
    WITH saved AS (
      INSERT INTO open_events (email_id, user_agent, kind, reason)
      VALUES (${emailId}, ${userAgent}, ${kind}, ${reason || null})
    )
    UPDATE emails SET ${totals} WHERE id = ${emailId}`);
}

async function saveClick(target: FoundLink, hit: Hit, kind: EventKind, reason: string) {
  const db = await getDb();
  const userAgent = hit.userAgent.slice(0, 500) || null;
  if (kind !== "real") {
    // Only real clicks change an email's totals.
    await db.insert(clickEvents).values({ emailId: target.id, linkId: target.linkId, userAgent, kind, reason: reason || null });
    return;
  }
  await db.execute(sql`
    WITH saved AS (
      INSERT INTO click_events (email_id, link_id, user_agent, kind, reason)
      VALUES (${target.id}, ${target.linkId}, ${userAgent}, ${kind}, ${reason || null})
    )
    UPDATE emails SET
      click_count = click_count + 1,
      first_open_at = LEAST(first_open_at, now()),
      last_open_at = GREATEST(last_open_at, now()),
      status = CASE WHEN sent_at IS NULL THEN 'draft' ELSE 'clicked' END
    WHERE id = ${target.id}`);
}

/**
 * Rebuilds an email's summary (status, counts, first/last open) from its raw
 * events, in one pass. Used after a correction ("That was me"), so the numbers
 * always agree with the activity list.
 */
export async function recompute(emailId: string) {
  const db = await getDb();
  await db.execute(sql`
    UPDATE emails SET
      status = CASE WHEN emails.sent_at IS NULL THEN 'draft'
                    WHEN s.clicks > 0 THEN 'clicked'
                    WHEN s.opens  > 0 THEN 'opened'
                    WHEN s.maybes > 0 THEN 'maybe'
                    ELSE 'sent' END,
      open_count = s.opens, maybe_count = s.maybes, click_count = s.clicks,
      first_open_at = s.first_at, last_open_at = s.last_at
    FROM (
      SELECT CAST(count(*) FILTER (WHERE src = 'o' AND kind = 'real')  AS integer) AS opens,
             CAST(count(*) FILTER (WHERE src = 'o' AND kind = 'maybe') AS integer) AS maybes,
             CAST(count(*) FILTER (WHERE src = 'c' AND kind = 'real')  AS integer) AS clicks,
             min(at) FILTER (WHERE kind = 'real') AS first_at,
             max(at) FILTER (WHERE kind = 'real') AS last_at
        FROM (SELECT 'o' AS src, kind, at FROM open_events  WHERE email_id = ${emailId} AND kind IN ('real','maybe')
              UNION ALL
              SELECT 'c' AS src, kind, at FROM click_events WHERE email_id = ${emailId} AND kind IN ('real','maybe')) x
    ) s
    WHERE emails.id = ${emailId}`);
}
