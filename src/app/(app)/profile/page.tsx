import Link from "next/link";
import { and, eq, gte, isNotNull, sql, type SQL } from "drizzle-orm";
import { GameData, StreakDays, StreakValue, YourStamps, type ServerFacts } from "@/components/game/GameData";
import { LevelBar } from "@/components/game/LevelBar";
import { LevelPrize, PRIZES, hueStyle, prizeFor } from "@/components/game/LevelPrize";
import { PrizeShelf } from "@/components/game/PrizeShelf";
import { Avatar, PageHead, Stat, Stats } from "@/components/ui";
import { getDb } from "@/db";
import { emails } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { levelFor, points } from "@/lib/game";

const DAY = 86_400_000;
const fmt = (n: number) => n.toLocaleString("en-US");

/** Everything the viewer has won: their level and its prize, every level prize, and all the stamps. */
export default async function ProfilePage() {
  const me = await requireUser();
  const db = await getDb();
  const now = Date.now();
  const mine: SQL = sql`${emails.ownerId} = ${me.id}`;
  const opened: SQL = sql`${emails.status} in ('opened', 'clicked')`;
  const n = (where: SQL) => sql<number>`(count(*) filter (where ${where}))::int`;
  const in30: SQL = sql`${emails.sentAt} >= ${sql`${new Date(now - 30 * DAY).toISOString()}::timestamptz`}`;
  const wait = sql`extract(epoch from (${emails.firstOpenAt} - ${emails.sentAt}))`;

  const [[t], recent] = await Promise.all([
    db
      .select({
        sent: sql<number>`count(*)::int`,
        opened: n(opened),
        clicked: n(sql`${emails.status} = 'clicked'`),
        linkClicks: sql<number>`(coalesce(sum(${emails.clickCount}), 0))::int`,
        fastest: sql<number | null>`(min(${wait}) filter (where ${opened} and ${emails.firstOpenAt} >= ${emails.sentAt}))::float8`,
        mostOpens: sql<number>`(coalesce(max(${emails.openCount}), 0))::int`,
        sent30: n(in30),
        opened30: n(sql`${in30} and ${opened}`),
      })
      .from(emails)
      .where(and(mine, isNotNull(emails.sentAt))),
    // Send times of the last 90 days: streaks are counted in the viewer's own days, in the browser.
    db
      .select({ at: emails.sentAt })
      .from(emails)
      .where(and(eq(emails.ownerId, me.id), gte(emails.sentAt, new Date(now - 90 * DAY))))
      .limit(5000),
  ]);

  const total = points(t);
  const level = levelFor(total);
  const prize = prizeFor(level.level);
  const person = { id: me.id, name: me.name, admin: me.role === "admin" };
  const facts: Record<string, ServerFacts> = {
    [me.id]: {
      sent: t.sent,
      opened: t.opened,
      linkClicks: t.linkClicks,
      fastestOpenMs: t.fastest === null ? null : t.fastest * 1000,
      mostOpens: t.mostOpens,
      sent30: t.sent30,
      opened30: t.opened30,
    },
  };
  const times = {
    [me.id]: recent.flatMap((r) => (r.at ? [r.at.toISOString()] : [])),
  };

  return (
    <GameData people={[person]} facts={facts} times={times} span={90}>
      <div className="game-page">
        <PageHead title="Your profile" sub="Your level, the prizes you have won and every stamp you have collected.">
          <Link href="/leaderboard" className="btn">
            See the leaderboard
          </Link>
        </PageHead>

        <section className="card pf-hero" aria-label="You" style={hueStyle(prize.hue)}>
          <div className="pf-who">
            <Avatar name={me.name} admin={person.admin} />
            <div className="pf-name">
              <h2>{me.name}</h2>
              <span>{person.admin ? "Admin" : "Team member"}</span>
            </div>
          </div>
          <div className="pf-prize">
            <div className="pf-prize-text">
              <b>
                Level {level.level} · {prize.title}
              </b>
              <span className="num">{fmt(total)} points all time</span>
              <LevelBar level={level} total={total} compact />
            </div>
            <LevelPrize level={level.level} state="reached" size="xl" decorative />
          </div>
        </section>

        <Stats label="Your totals">
          <Stat label="Points" value={fmt(total)} sub="All time" />
          <Stat label="Emails sent" value={fmt(t.sent)} sub={t.sent ? `${fmt(t.opened)} opened` : "None yet"} />
          <Stat label="Link clicks" value={fmt(t.linkClicks)} sub="All time" />
          <Stat label="Your streak" value={<StreakValue id={me.id} />} sub={<StreakDays id={me.id} />} />
        </Stats>

        <section className="card" aria-labelledby="prizes-title">
          <div className="card-head">
            <h2 id="prizes-title">Your prizes</h2>
            <span className="aside num">
              {Math.min(level.level, PRIZES.length)} of {PRIZES.length} won
            </span>
          </div>
          <div className="md-pad">
            <PrizeShelf level={level} />
          </div>
        </section>

        <YourStamps id={me.id} />
      </div>
    </GameData>
  );
}
