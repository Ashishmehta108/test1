import Link from "next/link";
import { and, eq, gte, isNotNull, sql, type SQL } from "drizzle-orm";
import { SERIES, SERIES_OTHER, pct } from "@/components/charts";
import { GameData, LeaderBody, StreakDays, StreakLeader, StreakValue, YourStamps, type ServerFacts } from "@/components/game/GameData";
import { HowPoints } from "@/components/game/HowPoints";
import { LevelBar } from "@/components/game/LevelBar";
import { LevelCard } from "@/components/game/LevelCard";
import { RaceChart } from "@/components/game/RaceChart";
import { Ranking, type RankRow } from "@/components/game/Ranking";
import { PageHead, Stat, Stats } from "@/components/ui";
import { getDb } from "@/db";
import { emails, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { howLong, levelFor, median, movement, ordinal, points, pointsForEmail, rank } from "@/lib/game";

type SP = Promise<Record<string, string | string[] | undefined>>;

const DAY = 86_400_000;
const PERIODS = [
  { key: "7", days: 7, label: "Last 7 days" },
  { key: "30", days: 30, label: "Last 30 days" },
  { key: "all", days: null, label: "All time" },
] as const;
/** Best open rate only counts people who sent at least this many emails in the period. */
const MIN_SENT_FOR_RATE = 5;
/** Fastest to be opened only counts people with at least this many opened emails in the period. */
const MIN_OPENED_FOR_SPEED = 3;

const iso = (d: Date) => sql`${d.toISOString()}::timestamptz`;

/**
 * Everyone's numbers, one row per person, worked out in the database:
 * this period, the period before (for who moved up or down), the last 30 days and all time.
 */
async function loadTotals(since: Date, before: Date) {
  const db = await getDb();
  const inNow: SQL = sql`${emails.sentAt} >= ${iso(since)}`;
  const inBefore: SQL = sql`${emails.sentAt} >= ${iso(before)} and ${emails.sentAt} < ${iso(since)}`;
  const in30: SQL = sql`${emails.sentAt} >= ${iso(new Date(Date.now() - 30 * DAY))}`;
  const opened: SQL = sql`${emails.status} in ('opened', 'clicked')`;
  const clicked: SQL = sql`${emails.status} = 'clicked'`;
  const n = (where: SQL) => sql<number>`(count(*) filter (where ${where}))::int`;
  const wait = sql`extract(epoch from (${emails.firstOpenAt} - ${emails.sentAt}))`;
  const waited: SQL = sql`${opened} and ${emails.firstOpenAt} >= ${emails.sentAt}`;

  return db
    .select({
      owner: emails.ownerId,
      sent: n(inNow),
      opened: n(sql`${inNow} and ${opened}`),
      clicked: n(sql`${inNow} and ${clicked}`),
      linkClicks: sql<number>`(coalesce(sum(${emails.clickCount}) filter (where ${inNow}), 0))::int`,
      typicalWait: sql<number | null>`(percentile_disc(0.5) within group (order by ${wait}) filter (where ${inNow} and ${waited}))::float8`,
      timedOpens: n(sql`${inNow} and ${waited}`),
      beforeSent: n(inBefore),
      beforeOpened: n(sql`${inBefore} and ${opened}`),
      beforeClicked: n(sql`${inBefore} and ${clicked}`),
      sent30: n(in30),
      opened30: n(sql`${in30} and ${opened}`),
      allSent: sql<number>`count(*)::int`,
      allOpened: n(opened),
      allClicked: n(clicked),
      allLinkClicks: sql<number>`(coalesce(sum(${emails.clickCount}), 0))::int`,
      fastest: sql<number | null>`(min(${wait}) filter (where ${waited}))::float8`,
      mostOpens: sql<number>`(coalesce(max(${emails.openCount}), 0))::int`,
    })
    .from(emails)
    .where(isNotNull(emails.sentAt))
    .groupBy(emails.ownerId)
    .limit(500);
}

export default async function LeaderboardPage({ searchParams }: { searchParams: SP }) {
  const me = await requireUser();
  const sp = await searchParams;
  const period = PERIODS.find((p) => p.key === sp.period) ?? PERIODS[1];
  const now = Date.now();
  const since = period.days ? new Date(now - period.days * DAY) : new Date(0);
  const before = period.days ? new Date(now - 2 * period.days * DAY) : new Date(0);

  const db = await getDb();
  const [people, totals, recent] = await Promise.all([
    // Only people who have joined and are not paused are on the board. Sorted by name, so colours stay put.
    db
      .select({ id: users.id, name: users.name, role: users.role })
      .from(users)
      .where(and(isNotNull(users.passwordHash), eq(users.active, true)))
      .orderBy(users.name)
      .limit(200),
    loadTotals(since, before),
    // Send times of the last 90 days: streaks and the race are counted in the viewer's own days, in the browser.
    db
      .select({
        owner: emails.ownerId,
        at: emails.sentAt,
        status: emails.status,
      })
      .from(emails)
      .where(gte(emails.sentAt, new Date(now - 90 * DAY)))
      .limit(20000),
  ]);

  const byOwner = new Map(totals.map((t) => [t.owner, t]));
  const zero = {
    sent: 0,
    opened: 0,
    clicked: 0,
    linkClicks: 0,
    typicalWait: null,
    timedOpens: 0,
    beforeSent: 0,
    beforeOpened: 0,
    beforeClicked: 0,
    sent30: 0,
    opened30: 0,
    allSent: 0,
    allOpened: 0,
    allClicked: 0,
    allLinkClicks: 0,
    fastest: null,
    mostOpens: 0,
  };
  const base = people.map((p) => {
    const t = byOwner.get(p.id) ?? { owner: p.id, ...zero };
    return {
      ...t,
      id: p.id,
      name: p.name,
      admin: p.role === "admin",
      points: points(t),
      beforePoints: points({
        sent: t.beforeSent,
        opened: t.beforeOpened,
        clicked: t.beforeClicked,
      }),
      allPoints: points({
        sent: t.allSent,
        opened: t.allOpened,
        clicked: t.allClicked,
      }),
    };
  });

  const ranked = rank(base);
  const beforeRank = new Map(rank(base.map((b) => ({ id: b.id, name: b.name, points: b.beforePoints }))).map((r) => [r.id, r]));
  const rows: RankRow[] = ranked.map((r) => {
    const was = beforeRank.get(r.id)!;
    return {
      id: r.id,
      name: r.name,
      admin: r.admin,
      position: r.position,
      points: r.points,
      sent: r.sent,
      opened: r.opened,
      linkClicks: r.linkClicks,
      level: levelFor(r.allPoints),
      move: movement(r.position, was.points > 0 ? was.position : null, r.points),
    };
  });

  const mine = ranked.find((r) => r.id === me.id);
  const myLevel = levelFor(mine?.allPoints ?? 0);
  const periodWords = period.days ? `in the last ${period.days} days` : "all time";

  // How far the viewer is from the person above, or ahead of the person below.
  let pointsSub = "";
  if (!mine || mine.points === 0) pointsSub = "Send a tracked email to get on the board";
  else {
    const above = ranked.filter((r) => r.points > mine.points).at(-1);
    const below = ranked.find((r) => r.points < mine.points && r.points > 0);
    if (above) pointsSub = `${above.points - mine.points} behind ${above.name.split(" ")[0]}`;
    else if (ranked.some((r) => r.id !== me.id && r.points === mine.points)) pointsSub = "Level with the leader";
    else if (below) pointsSub = `${mine.points - below.points} ahead of ${below.name.split(" ")[0]}`;
    else pointsSub = periodWords;
  }

  // The leaders strip. Everyone tied at the top is named.
  const leadersOf = <T,>(list: T[], value: (t: T) => number, low = false) => {
    if (!list.length) return [] as T[];
    const best = low ? Math.min(...list.map(value)) : Math.max(...list.map(value));
    return list.filter((t) => value(t) === best);
  };
  const rateQualified = base.filter((b) => b.sent >= MIN_SENT_FOR_RATE);
  const rateLeaders = leadersOf(rateQualified, (b) => b.opened / b.sent);
  const clickLeaders = leadersOf(
    base.filter((b) => b.linkClicks > 0),
    (b) => b.linkClicks,
  );
  const speedQualified = base.filter((b) => b.timedOpens >= MIN_OPENED_FOR_SPEED && b.typicalWait !== null);
  const speedLeaders = leadersOf(speedQualified, (b) => b.typicalWait!, true);
  const person = (b: { id: string; name: string; admin: boolean }) => ({
    id: b.id,
    name: b.name,
    admin: b.admin,
  });

  // For the browser: facts behind the stamps, and send times for the streaks and the race.
  const facts: Record<string, ServerFacts> = Object.fromEntries(
    base.map((b) => [
      b.id,
      {
        sent: b.allSent,
        opened: b.allOpened,
        linkClicks: b.allLinkClicks,
        fastestOpenMs: b.fastest === null ? null : b.fastest * 1000,
        mostOpens: b.mostOpens,
        sent30: b.sent30,
        opened30: b.opened30,
      },
    ]),
  );
  const times: Record<string, string[]> = Object.fromEntries(people.map((p) => [p.id, [] as string[]]));
  const race: { o: string; at: string; p: number }[] = [];
  for (const e of recent) {
    if (!e.at || !times[e.owner]) continue;
    const at = e.at.toISOString();
    times[e.owner].push(at);
    if (e.at.getTime() >= now - 30 * DAY) race.push({ o: e.owner, at, p: pointsForEmail(e.status) });
  }
  const gamePeople = people.map((p) => ({
    id: p.id,
    name: p.name,
    admin: p.role === "admin",
  }));
  const racePeople = people.map((p, i) => ({
    id: p.id,
    name: p.name,
    color: SERIES[i] ?? SERIES_OTHER,
  }));
  const span = period.days ?? 90;

  return (
    <GameData people={gamePeople} facts={facts} times={times} span={span}>
      <div className="game-page">
        <PageHead title="Leaderboard" sub="Points for the tracked emails everyone sends. The whole team sees the same board.">
          <nav className="segmented" aria-label="Period">
            {PERIODS.map((p) => (
              <Link key={p.key} href={p.key === "30" ? "/leaderboard" : `/leaderboard?period=${p.key}`} aria-current={p.key === period.key ? "true" : undefined} scroll={false}>
                {p.label}
              </Link>
            ))}
          </nav>
        </PageHead>

        <Stats label="Where you stand">
          <Stat
            label="Your place"
            value={mine && mine.points > 0 ? ordinal(mine.position) : "—"}
            sub={mine && mine.points > 0 ? `of ${ranked.length} ${periodWords}` : `Not on the board ${periodWords} yet`}
          />
          <Stat label="Your points" value={mine?.points ?? 0} sub={pointsSub} />
          <Stat label="Your level" value={`Level ${myLevel.level}`} sub={<LevelBar level={myLevel} total={mine?.allPoints ?? 0} compact />} />
          <Stat label="Your streak" value={<StreakValue id={me.id} />} sub={<StreakDays id={me.id} />} />
        </Stats>

        <LevelCard level={myLevel} total={mine?.allPoints ?? 0} />

        <Ranking rows={rows} meId={me.id} periodLabel={period.label} showMoves={period.days !== null} alone={people.length <= 1} />

        <section className="card" aria-labelledby="leaders-title">
          <div className="card-head">
            <h2 id="leaders-title">Leaders</h2>
            <span className="aside">{period.label}</span>
          </div>
          <div className="game-leaders">
            <LeaderBody
              title="Best open rate"
              rule={`Counts people with at least ${MIN_SENT_FOR_RATE} emails sent`}
              who={rateLeaders.map(person)}
              meId={me.id}
              value={rateLeaders.length ? `${pct(rateLeaders[0].opened, rateLeaders[0].sent)} opened, at least ${MIN_SENT_FOR_RATE} sent` : undefined}
              none={`Nobody has sent ${MIN_SENT_FOR_RATE} emails yet.`}
            />
            <LeaderBody
              title="Most links clicked"
              rule="Clicks on links across all their emails"
              who={clickLeaders.map(person)}
              meId={me.id}
              value={clickLeaders.length ? `${clickLeaders[0].linkClicks} link ${clickLeaders[0].linkClicks === 1 ? "click" : "clicks"}` : undefined}
              none="No links clicked yet."
            />
            <LeaderBody
              title="Fastest to be opened"
              rule={`Typical time to the first open, at least ${MIN_OPENED_FOR_SPEED} opened`}
              who={speedLeaders.map(person)}
              meId={me.id}
              value={speedLeaders.length ? `${howLong(speedLeaders[0].typicalWait! * 1000)}, typically` : undefined}
              none={`Nobody has ${MIN_OPENED_FOR_SPEED} opened emails yet.`}
            />
            <StreakLeader people={gamePeople} meId={me.id} spanLabel={period.days ? `last ${period.days} days` : "last 90 days"} />
          </div>
        </section>

        <RaceChart people={racePeople} items={race} meId={me.id} />

        <div className="game-grid">
          <YourStamps id={me.id} />
          <HowPoints />
        </div>
      </div>
    </GameData>
  );
}
