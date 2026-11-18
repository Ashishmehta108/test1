import { one, q } from "./db";
import { userForSessionToken } from "./auth";

export type EventKind = "real" | "maybe" | "ignored";
export type Status = "draft" | "sent" | "maybe" | "opened" | "clicked";

type EmailForTracking = {
  id: string;
  owner_id: string;
  sent_at: Date | string | null;
  owner_last_ip: string | null;
  owner_last_ip_at: Date | string | null;
};

export type Hit = {
  ip: string | null;
  userAgent: string;
  sessionToken: string | undefined;
};

/** Transparent 1×1 GIF (42 bytes). */
export const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

const SCANNER_WINDOW_SECONDS = 10;
const SAME_CONNECTION_HOURS = 24;

async function findEmailByToken(token: string) {
  return one<EmailForTracking>(
    `SELECT e.id, e.owner_id, e.sent_at, u.last_ip AS owner_last_ip, u.last_ip_at AS owner_last_ip_at
       FROM emails e JOIN users u ON u.id = e.owner_id
      WHERE e.token = $1`,
    [token],
  );
}

/**
 * Apple Mail Privacy Protection downloads every picture automatically, from
 * Apple's own servers, with a bare "Mozilla/5.0" user agent. We can't tell if a
 * person actually read it, so it's recorded as "maybe".
 */
function looksLikeApplePrefetch(ip: string | null, ua: string) {
  return ua.trim() === "Mozilla/5.0" || (ip?.startsWith("17.") ?? false);
}

async function classify(
  email: EmailForTracking,
  hit: Hit,
  type: "open" | "click",
): Promise<{ kind: EventKind; reason: string }> {
  if (!email.sent_at) {
    return { kind: "ignored", reason: "Before it was marked as sent (your own preview)" };
  }

  const viewer = await userForSessionToken(hit.sessionToken);
  if (viewer) {
    return { kind: "ignored", reason: `Viewed by ${viewer.name}, who is signed in to the tracker` };
  }

  if (
    hit.ip &&
    email.owner_last_ip === hit.ip &&
    email.owner_last_ip_at &&
    Date.now() - new Date(email.owner_last_ip_at).getTime() < SAME_CONNECTION_HOURS * 3600_000
  ) {
    return { kind: "ignored", reason: "Same internet connection as the sender" };
  }

  const secondsSinceSent = (Date.now() - new Date(email.sent_at).getTime()) / 1000;
  if (secondsSinceSent < SCANNER_WINDOW_SECONDS) {
    return { kind: "maybe", reason: "Seconds after sending, probably a security scanner" };
  }

  if (type === "open" && looksLikeApplePrefetch(hit.ip, hit.userAgent)) {
    return { kind: "maybe", reason: "Apple Mail loads pictures automatically" };
  }

  return { kind: "real", reason: "" };
}

export async function recordOpen(token: string, hit: Hit) {
  const email = await findEmailByToken(token);
  if (!email) return;
  const { kind, reason } = await classify(email, hit, "open");
  await q(
    `INSERT INTO open_events (email_id, ip, user_agent, kind, reason) VALUES ($1,$2,$3,$4,$5)`,
    [email.id, hit.ip, hit.userAgent.slice(0, 500), kind, reason || null],
  );
  await recompute(email.id);
}

export async function findLink(token: string, position: number) {
  return one<{ link_id: number; url: string }>(
    `SELECT l.id AS link_id, l.url
       FROM links l JOIN emails e ON e.id = l.email_id
      WHERE e.token = $1 AND l.position = $2`,
    [token, position],
  );
}

export async function recordClick(token: string, linkId: number, hit: Hit) {
  const email = await findEmailByToken(token);
  if (!email) return;
  const { kind, reason } = await classify(email, hit, "click");
  await q(
    `INSERT INTO click_events (email_id, link_id, ip, user_agent, kind, reason) VALUES ($1,$2,$3,$4,$5,$6)`,
    [email.id, linkId, hit.ip, hit.userAgent.slice(0, 500), kind, reason || null],
  );
  await recompute(email.id);
}

/**
 * Rebuilds an email's summary (status, counts, first/last open) from its raw
 * events. Always derived, never patched, so "That was me" corrections and
 * mark-as-sent / undo stay consistent.
 */
export async function recompute(emailId: string) {
  const row = await one<{
    sent_at: Date | null;
    opens: number;
    maybes: number;
    clicks: number;
    first_at: Date | null;
    last_at: Date | null;
  }>(
    `SELECT e.sent_at,
            (SELECT CAST(count(*) AS integer) FROM open_events  WHERE email_id = e.id AND kind = 'real')  AS opens,
            (SELECT CAST(count(*) AS integer) FROM open_events  WHERE email_id = e.id AND kind = 'maybe') AS maybes,
            (SELECT CAST(count(*) AS integer) FROM click_events WHERE email_id = e.id AND kind = 'real')  AS clicks,
            (SELECT min(at) FROM (SELECT at FROM open_events  WHERE email_id = e.id AND kind = 'real'
                                  UNION ALL
                                  SELECT at FROM click_events WHERE email_id = e.id AND kind = 'real') x) AS first_at,
            (SELECT max(at) FROM (SELECT at FROM open_events  WHERE email_id = e.id AND kind = 'real'
                                  UNION ALL
                                  SELECT at FROM click_events WHERE email_id = e.id AND kind = 'real') x) AS last_at
       FROM emails e WHERE e.id = $1`,
    [emailId],
  );
  if (!row) return;

  let status: Status = "sent";
  if (!row.sent_at) status = "draft";
  else if (row.clicks > 0) status = "clicked";
  else if (row.opens > 0) status = "opened";
  else if (row.maybes > 0) status = "maybe";

  await q(
    `UPDATE emails SET status = $2, open_count = $3, maybe_count = $4, click_count = $5,
                       first_open_at = $6, last_open_at = $7
      WHERE id = $1`,
    [emailId, status, row.opens, row.maybes, row.clicks, row.first_at, row.last_at],
  );
}
