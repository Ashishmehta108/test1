import { and, count, eq, gte, isNotNull, sql } from "drizzle-orm";
import { ChartCard, ChartEmpty, ChartFoot, Donut, OUTCOME, RankBars, pct, withSeriesColors, type RankRow } from "@/components/charts";
import { BusyTimes } from "@/components/insights/BusyTimes";
import { PeopleBreakdown, type PersonOutcomes } from "@/components/insights/PeopleBreakdown";
import { TeamLines } from "@/components/TeamLines";
import { Trend } from "@/components/Trend";
import { TimeZoneNote } from "@/components/When";
import { PageHead, PeoplePicker, Stat, Stats } from "@/components/ui";
import { getDb } from "@/db";
import { emails, openEvents, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { deviceName } from "@/lib/format";

type SP = Promise<Record<string, string | string[] | undefined>>;

const HOUR = 3_600_000;
const SPEEDS = [
  { label: "Within 1 hour", upTo: HOUR },
  { label: "1 to 6 hours", upTo: 6 * HOUR },
  { label: "6 to 24 hours", upTo: 24 * HOUR },
  { label: "1 to 3 days", upTo: 72 * HOUR },
  { label: "Later", upTo: Infinity },
];
/** In the address, ?user=everyone means the whole team added together (admins only). */
const EVERYONE = "everyone";

const monthAgo = () => new Date(Date.now() - 30 * 24 * HOUR);

async function loadPeople() {
  const db = await getDb();
  return db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(isNotNull(users.passwordHash))
    .orderBy(sql`${users.role} = 'admin' desc`, users.name);
}

/** Admin only: everyone's tracked emails in the last 30 days, and how each person's turned out. */
async function loadTeam() {
  const db = await getDb();
  const since = monthAgo();
  const [sent, outcomes] = await Promise.all([
    db.select({ owner: emails.ownerId, at: emails.sentAt }).from(emails).where(gte(emails.sentAt, since)).limit(20000),
    db
      .select({ owner: emails.ownerId, status: emails.status, n: count() })
      .from(emails)
      .where(gte(emails.sentAt, since))
      .groupBy(emails.ownerId, emails.status)
      .limit(500),
  ]);
  return { sent, outcomes };
}

/**
 * The last 30 days: the emails sent and the real opens they got.
 * For one person, or for the whole team added together when `owner` is left out (only ever called that way for an admin).
 */
async function load(owner?: string) {
  const db = await getDb();
  const since = monthAgo();
  const mine = owner ? eq(emails.ownerId, owner) : undefined;
  const [sent, opens] = await Promise.all([
    db
      .select({ sentAt: emails.sentAt, firstOpenAt: emails.firstOpenAt, status: emails.status })
      .from(emails)
      .where(and(mine, gte(emails.sentAt, since)))
      .limit(20000),
    db
      .select({ at: openEvents.at, userAgent: openEvents.userAgent })
      .from(openEvents)
      .innerJoin(emails, eq(emails.id, openEvents.emailId))
      .where(and(mine, eq(openEvents.kind, "real"), gte(openEvents.at, since)))
      .limit(20000),
  ]);
  return { sent, opens };
}

/** "40 min", "3 hours", "2 days": how long something took, in plain words (same wording as the Results page). */
function howLong(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 1) return "Under a minute";
  if (min < 60) return `${min} min`;
  const hours = Math.round(min / 60);
  if (hours < 48) return hours === 1 ? "1 hour" : `${hours} hours`;
  return `${Math.round(hours / 24)} days`;
}

export default async function InsightsPage({ searchParams }: { searchParams: SP }) {
  const me = await requireUser();
  const sp = await searchParams;
  const asked = typeof sp.user === "string" ? sp.user : "";
  const isAdmin = me.role === "admin";
  const everyone = isAdmin && asked === EVERYONE;
  const requested = isAdmin && !everyone && asked !== me.id ? asked : "";

  // Other people's numbers are only ever fetched for an admin.
  const [people, team, first] = await Promise.all([
    isAdmin ? loadPeople() : Promise.resolve([]),
    everyone ? loadTeam() : Promise.resolve({ sent: [], outcomes: [] }),
    everyone ? load() : load(requested || me.id),
  ]);
  const known = requested && people.some((p) => p.id === requested);
  const viewing = everyone ? EVERYONE : known ? requested : me.id;
  const { sent, opens } = everyone || known || !requested ? first : await load(me.id);
  const person = viewing === me.id || everyone ? me : people.find((p) => p.id === viewing)!;
  const firstName = person.name.split(" ")[0];
  // Whose emails these are, in words: "your", "Meera's" or "everyone's".
  const whose = everyone ? "everyone's" : viewing === me.id ? "your" : `${firstName}'s`;

  // What happened to each email sent in the period. Every email counts once, under its furthest step.
  const by = (s: string) => sent.filter((e) => e.status === s).length;
  const outcome = { clicked: by("clicked"), opened: by("opened"), maybe: by("maybe"), waiting: by("sent") };
  const openedOrClicked = outcome.clicked + outcome.opened;
  const total = sent.length;

  const waits = sent
    .filter((e) => e.sentAt && e.firstOpenAt)
    .map((e) => e.firstOpenAt!.getTime() - e.sentAt!.getTime())
    .filter((ms) => ms >= 0)
    .sort((a, b) => a - b);
  const typicalWait = waits.length ? waits[Math.floor((waits.length - 1) / 2)] : null;

  const speedRows: RankRow[] = [
    ...SPEEDS.map((s, i) => ({
      label: s.label,
      value: waits.filter((ms) => ms < s.upTo && ms >= (i === 0 ? 0 : SPEEDS[i - 1].upTo)).length,
    })),
    { label: "Not opened yet", value: total - waits.length, quiet: true },
  ];

  const byDevice = new Map<string, number>();
  for (const o of opens) {
    const name = deviceName(o.userAgent);
    byDevice.set(name, (byDevice.get(name) ?? 0) + 1);
  }
  const devices = withSeriesColors(
    [...byDevice].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    5,
  );

  const outcomeSlices = (["clicked", "opened", "maybe", "waiting"] as const).map((k) => ({ key: k, label: OUTCOME[k].label, value: outcome[k], color: OUTCOME[k].color }));

  const teamPeople: PersonOutcomes[] = people.map((p) => {
    const n = (s: string) => team.outcomes.find((r) => r.owner === p.id && r.status === s)?.n ?? 0;
    return { id: p.id, name: p.name, admin: p.role === "admin", clicked: n("clicked"), opened: n("opened"), maybe: n("maybe"), waiting: n("sent") };
  });

  return (
    <>
      <PageHead
        title={everyone ? "Everyone's insights" : viewing === me.id ? "Insights" : `${firstName}'s insights`}
        sub={everyone ? "The whole team added together, over the last 30 days." : `How ${whose} tracked emails did over the last 30 days.`}
      />

      {isAdmin && people.length > 1 && (
        <PeoplePicker
          people={people}
          meId={me.id}
          viewing={viewing}
          hrefFor={(id) => (id === me.id ? "/insights" : `/insights?user=${id}`)}
          everyone={{ href: `/insights?user=${EVERYONE}`, current: everyone }}
          label="Choose whose insights to see"
        />
      )}

      <Stats label="The last 30 days in numbers">
        <Stat label="Emails sent" value={total} sub={total ? "in the last 30 days" : "nothing sent in the last 30 days"} />
        <Stat label="Open rate" value={pct(openedOrClicked, total)} sub={total ? `${openedOrClicked} of ${total} opened` : undefined} />
        <Stat label="Click rate" value={pct(outcome.clicked, total)} sub={total ? `${outcome.clicked} of ${total} clicked a link` : undefined} />
        <Stat
          label="Typical time to open"
          value={typicalWait === null ? "—" : howLong(typicalWait)}
          sub={typicalWait === null ? "no opens yet" : waits.length === 1 ? "from the one opened email" : "half were opened sooner"}
        />
      </Stats>

      <div className="ins-grid">
        <ChartCard title={`What happened to ${whose} emails`} note={total ? `All ${total} emails sent, each counted once` : undefined}>
          {total ? (
            <Donut slices={outcomeSlices} centerValue={pct(openedOrClicked, total)} centerLabel="opened" label={`What happened to ${total} emails`} />
          ) : (
            <ChartEmpty>No emails sent in the last 30 days.</ChartEmpty>
          )}
        </ChartCard>

        <ChartCard title="From sent to clicked" note={total ? "How many emails reached each step" : undefined}>
          {total ? (
            <div className="ins-funnel">
              <RankBars
                total={total}
                max={total}
                rows={[
                  { label: "Sent", value: total, color: OUTCOME.waiting.color, note: "100%" },
                  { label: "Opened", value: openedOrClicked, color: OUTCOME.opened.color, note: `${pct(openedOrClicked, total)} of sent` },
                  { label: "Clicked a link", value: outcome.clicked, color: OUTCOME.clicked.color, note: `${pct(outcome.clicked, total)} of sent` },
                ]}
              />
              <ChartFoot>
                {openedOrClicked
                  ? <>Of the emails that were opened, <b>{pct(outcome.clicked, openedOrClicked)}</b> also had a link clicked.</>
                  : "None of these emails has been opened yet."}
              </ChartFoot>
            </div>
          ) : (
            <ChartEmpty>No emails sent in the last 30 days.</ChartEmpty>
          )}
        </ChartCard>
      </div>

      <Trend title="Emails sent each day" note="The green part of each bar is the emails that were opened" sent={sent.map((e) => e.sentAt!.toISOString())} opened={sent.filter((e) => e.firstOpenAt).map((e) => e.sentAt!.toISOString())} />

      <BusyTimes opens={opens.map((o) => o.at.toISOString())} />

      <div className="ins-grid">
        <ChartCard title="How quickly emails get opened" note={total ? "Time from sending to the first open" : undefined}>
          {total ? <RankBars rows={speedRows} total={total} /> : <ChartEmpty>No emails sent in the last 30 days.</ChartEmpty>}
        </ChartCard>

        <ChartCard title="Where they're opened" note={opens.length ? "The app or device behind each open" : undefined}>
          {opens.length ? (
            <Donut slices={devices} centerValue={String(opens.length)} centerLabel={opens.length === 1 ? "open" : "opens"} label={`Where ${opens.length} opens happened`} />
          ) : (
            <ChartEmpty>No opens in the last 30 days yet.</ChartEmpty>
          )}
        </ChartCard>
      </div>

      {everyone && (
        <section className="ins-team" aria-labelledby="ins-team-title">
          <div className="ins-section-head">
            <h2 id="ins-team-title" className="ins-section-title">Person by person</h2>
          </div>
          <TeamLines people={people.map((p) => ({ id: p.id, name: p.name }))} sent={team.sent.map((t) => ({ owner: t.owner, at: t.at!.toISOString() }))} />
          <PeopleBreakdown people={teamPeople} meId={me.id} />
        </section>
      )}

      <TimeZoneNote />
    </>
  );
}
