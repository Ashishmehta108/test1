import { cache } from "react";
import { and, eq, isNotNull, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { emails, users } from "@/db/schema";
import { levelFor, points, rank, type Level } from "@/lib/game";
import type { ServerFacts } from "./GameData";

/** One person's game, as the server knows it. Streaks (and the stamps that need them) are finished in the browser. */
export type GameState = {
  /** All-time points. */
  total: number;
  level: Level;
  /** Everything the stamps look at except the streak. */
  facts: ServerFacts;
  /** When each email of the last 90 days was sent (ISO text), for the streak. */
  times: string[];
};

/**
 * A person's points, level, stamp facts and recent send times, in ONE database round trip that only reads
 * their own rows (by owner, which is indexed). Wrapped in `cache()` so the layout and the page share it
 * within one request.
 */
export const getGameState = cache(async (userId: string): Promise<GameState> => {
  const db = await getDb();
  const n = (where: SQL) => sql<number>`(count(*) filter (where ${where}))::int`;
  const opened: SQL = sql`${emails.status} in ('opened', 'clicked')`;
  const in30: SQL = sql`${emails.sentAt} >= now() - interval '30 days'`;
  const wait = sql`extract(epoch from (${emails.firstOpenAt} - ${emails.sentAt}))`;

  const [row] = await db
    .select({
      sent: sql<number>`count(*)::int`,
      opened: n(opened),
      clicked: n(sql`${emails.status} = 'clicked'`),
      linkClicks: sql<number>`(coalesce(sum(${emails.clickCount}), 0))::int`,
      fastest: sql<number | null>`(min(${wait}) filter (where ${opened} and ${emails.firstOpenAt} >= ${emails.sentAt}))::float8`,
      mostOpens: sql<number>`(coalesce(max(${emails.openCount}), 0))::int`,
      sent30: n(in30),
      opened30: n(sql`${in30} and ${opened}`),
      // Seconds since 1970 as plain numbers: every driver reads these the same way.
      recent: sql<(number | string)[] | null>`array_agg(extract(epoch from ${emails.sentAt})::float8 order by ${emails.sentAt}) filter (where ${emails.sentAt} >= now() - interval '90 days')`,
    })
    .from(emails)
    .where(and(eq(emails.ownerId, userId), isNotNull(emails.sentAt)));

  const r = row ?? { sent: 0, opened: 0, clicked: 0, linkClicks: 0, fastest: null, mostOpens: 0, sent30: 0, opened30: 0, recent: null };
  const total = points({ sent: Number(r.sent), opened: Number(r.opened), clicked: Number(r.clicked) });
  return {
    total,
    level: levelFor(total),
    facts: {
      sent: Number(r.sent),
      opened: Number(r.opened),
      linkClicks: Number(r.linkClicks),
      fastestOpenMs: r.fastest === null ? null : Number(r.fastest) * 1000,
      mostOpens: Number(r.mostOpens),
      sent30: Number(r.sent30),
      opened30: Number(r.opened30),
    },
    times: (r.recent ?? []).map((s) => new Date(Number(s) * 1000).toISOString()),
  };
});

/**
 * Where a person stands on the leaderboard's default view (the last 30 days): their place, how many are on the
 * board, and their points. Everyone on the board with their totals, in one grouped query (one round trip).
 * Only for the Results page; the layout never calls it.
 */
export async function getBoardPlace(userId: string): Promise<{ position: number; of: number; points: number; toNext: number | null }> {
  const db = await getDb();
  const in30: SQL = sql`${emails.sentAt} >= now() - interval '30 days'`;
  const n = (where: SQL) => sql<number>`(count(${emails.id}) filter (where ${where}))::int`;
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      sent: n(in30),
      opened: n(sql`${in30} and ${emails.status} in ('opened', 'clicked')`),
      clicked: n(sql`${in30} and ${emails.status} = 'clicked'`),
    })
    .from(users)
    .leftJoin(emails, eq(emails.ownerId, users.id))
    // Same people as the leaderboard: joined and not paused.
    .where(and(isNotNull(users.passwordHash), eq(users.active, true)))
    .groupBy(users.id)
    .limit(200);
  const ranked = rank(rows.map((r) => ({ id: r.id, name: r.name, points: points({ sent: Number(r.sent), opened: Number(r.opened), clicked: Number(r.clicked) }) })));
  const mine = ranked.find((r) => r.id === userId);
  // Points needed to move up one place (null when first or not on the board).
  const above = mine && mine.points > 0 ? ranked.filter((r) => r.points > mine.points).at(-1) : undefined;
  return { position: mine?.position ?? ranked.length, of: ranked.length, points: mine?.points ?? 0, toNext: above ? above.points - mine!.points : null };
}
