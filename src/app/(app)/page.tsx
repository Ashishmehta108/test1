import { and, count, desc, eq, gte, ilike, inArray, isNotNull, or, sql } from "drizzle-orm";
import Link from "next/link";
import { TrackButton } from "@/components/TrackEmail";
import { Trend } from "@/components/Trend";
import { YourGame } from "@/components/game/YourGame";
import { getBoardPlace, getGameState } from "@/components/game/state";
import { CountMark } from "@/components/results/CountMark";
import { Outcomes } from "@/components/results/Outcomes";
import { ResultsEmpty } from "@/components/results/ResultsEmpty";
import { TimeZoneNote, When } from "@/components/When";
import { Notice, PageHead, PeoplePicker, Stat, Stats, StatusTag } from "@/components/ui";
import { getDb } from "@/db";
import { emails, users, type Status } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { iso, percent } from "@/lib/format";
import { emailPointsNote, pointsForEmail } from "@/lib/game";
import { PointChip } from "@/components/game/PointChip";

type SP = Promise<Record<string, string | string[] | undefined>>;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "opened", label: "Opened" },
  { key: "maybe", label: "Maybe" },
  { key: "waiting", label: "Not opened" },
  { key: "draft", label: "Not sent yet" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

/** The list shows at most this many emails, newest first. */
const LIMIT = 300;

const FILTER_STATUSES: Record<FilterKey, Status[] | undefined> = {
  all: undefined,
  opened: ["opened", "clicked"],
  maybe: ["maybe"],
  waiting: ["sent"],
  draft: ["draft"],
};

/** Everyone who can have results (admin only). */
async function loadPeople() {
  const db = await getDb();
  return db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(isNotNull(users.passwordHash))
    .orderBy(sql`${users.role} = 'admin' desc`, users.name);
}

/** "40 min", "3 hours", "2 days": how long something took, in plain words. */
function howLong(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 1) return "Under a minute";
  if (min < 60) return `${min} min`;
  const hours = Math.round(min / 60);
  if (hours < 48) return hours === 1 ? "1 hour" : `${hours} hours`;
  return `${Math.round(hours / 24)} days`;
}

/** One person's totals, their last 30 days and their emails, fetched at the same time. */
async function loadResults(owner: string, filter: FilterKey, search: string) {
  const db = await getDb();
  const statuses = FILTER_STATUSES[filter];
  const like = `%${search.replace(/[\\%_]/g, "\\$&")}%`;

  const monthAgo = new Date(Date.now() - 30 * 86_400_000);

  const [byStatus, recent, rows] = await Promise.all([
    db.select({ status: emails.status, n: count() }).from(emails).where(eq(emails.ownerId, owner)).groupBy(emails.status),
    // The last 30 days, for the chart and the "typical time to open".
    db
      .select({ sentAt: emails.sentAt, firstOpenAt: emails.firstOpenAt })
      .from(emails)
      .where(and(eq(emails.ownerId, owner), gte(emails.sentAt, monthAgo))),
    db
      .select({
        id: emails.id,
        recipientEmail: emails.recipientEmail,
        recipientName: emails.recipientName,
        label: emails.label,
        status: emails.status,
        sentAt: emails.sentAt,
        firstOpenAt: emails.firstOpenAt,
        openCount: emails.openCount,
        clickCount: emails.clickCount,
      })
      .from(emails)
      .where(
        and(
          eq(emails.ownerId, owner),
          statuses && inArray(emails.status, statuses),
          search ? or(ilike(emails.recipientEmail, like), ilike(emails.recipientName, like), ilike(emails.label, like), ilike(emails.notes, like)) : undefined,
        ),
      )
      .orderBy(desc(sql`coalesce(${emails.sentAt}, ${emails.createdAt})`))
      .limit(LIMIT),
  ]);

  const n = (s: Status) => byStatus.find((r) => r.status === s)?.n ?? 0;
  const total = byStatus.reduce((sum, r) => sum + r.n, 0);
  const totals = {
    total,
    openedOnly: n("opened"),
    drafts: n("draft"),
    sent: total - n("draft"),
    opened: n("opened") + n("clicked"),
    clicked: n("clicked"),
    maybe: n("maybe"),
    waiting: n("sent"),
  };
  const waits = recent
    .filter((r) => r.sentAt && r.firstOpenAt)
    .map((r) => r.firstOpenAt!.getTime() - r.sentAt!.getTime())
    .filter((ms) => ms >= 0)
    .sort((a, b) => a - b);
  const trend = {
    sent: recent.map((r) => r.sentAt!.toISOString()),
    opened: recent.filter((r) => r.firstOpenAt).map((r) => r.sentAt!.toISOString()),
    typicalWait: waits.length ? waits[Math.floor((waits.length - 1) / 2)] : null,
    openedCount: waits.length,
  };
  return { totals, rows, trend };
}

export default async function ResultsPage({ searchParams }: { searchParams: SP }) {
  const me = await requireUser();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  const isAdmin = me.role === "admin";
  const requested = isAdmin && str("user") !== me.id ? str("user") : "";
  const filter = (FILTERS.find((f) => f.key === str("show"))?.key ?? "all") as FilterKey;
  const search = str("q").slice(0, 100);

  // The list of people and the results load together. If an admin asks for someone who
  // isn't on the team, fall back to their own results.
  // A person's own game (points, level, place on the board) loads alongside, only on their own results.
  const loadGame = () => Promise.all([getGameState(me.id), getBoardPlace(me.id)]);
  const [people, first, ownGame] = await Promise.all([
    isAdmin ? loadPeople() : Promise.resolve([]),
    loadResults(requested || me.id, filter, search),
    requested ? Promise.resolve(null) : loadGame(),
  ]);
  const known = requested && people.some((p) => p.id === requested);
  const viewing = known ? requested : me.id;
  const { totals, rows, trend } = known || !requested ? first : await loadResults(me.id, filter, search);
  const viewingPerson = viewing === me.id ? me : people.find((p) => p.id === viewing)!;

  const counts: Record<FilterKey, number> = {
    all: totals.total,
    opened: totals.opened,
    maybe: totals.maybe,
    waiting: totals.waiting,
    draft: totals.drafts,
  };

  const href = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    const merged = { user: viewing === me.id ? "" : viewing, show: filter === "all" ? "" : filter, q: search, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/?${s}` : "/";
  };

  const viewingSelf = viewing === me.id;
  const game = viewingSelf ? (ownGame ?? (await loadGame())) : null;
  const firstName = viewingPerson.name.split(" ")[0];
  const narrowed = filter !== "all" || search !== "";
  const shown =
    rows.length >= LIMIT
      ? `Showing the latest ${LIMIT} emails`
      : narrowed
        ? `${rows.length} of ${totals.total} ${totals.total === 1 ? "email" : "emails"}`
        : `${rows.length} ${rows.length === 1 ? "email" : "emails"}`;

  return (
    <>
      {sp.welcome && <Notice kind="ok">Welcome. Your account is ready. Track your first email to get started.</Notice>}
      {sp.deleted && <Notice kind="ok">The email was deleted.</Notice>}

      <PageHead
        title={viewingSelf ? "Your results" : `${firstName}'s results`}
        sub={viewingSelf ? undefined : `You're viewing ${viewingPerson.name}'s emails. They only see their own.`}
      >
        {viewingSelf && <TrackButton className="btn btn-primary results-track">Track an email</TrackButton>}
      </PageHead>

      {isAdmin && people.length > 1 && (
        <PeoplePicker
          people={people}
          meId={me.id}
          viewing={viewing}
          label="Choose whose results to see"
          hrefFor={(id) => href({ user: id === me.id ? "" : id, show: "", q: "" })}
        />
      )}

      <Stats>
        <Stat label="Emails sent" value={totals.sent} sub={totals.drafts ? `${totals.drafts} not sent yet` : undefined} />
        <Stat
          label="Opened"
          value={percent(totals.opened, totals.sent)}
          sub={`${totals.opened} of ${totals.sent}${totals.maybe > 0 ? ` · ${totals.maybe} maybe, not counted` : ""}`}
        />
        <Stat label="Clicked a link" value={percent(totals.clicked, totals.sent)} sub={`${totals.clicked} of ${totals.sent}`} />
        <Stat
          label="Typical time to open"
          value={trend.typicalWait === null ? "—" : howLong(trend.typicalWait)}
          sub={trend.openedCount ? "over the last 30 days" : "nothing opened lately"}
        />
      </Stats>

      {game && <YourGame place={game[1]} level={game[0].level} facts={game[0].facts} times={game[0].times} />}

      {totals.total > 0 && (
        <div className="results-charts">
          <Outcomes
            title={viewingSelf ? "What happened to your emails" : `What happened to ${firstName}'s emails`}
            sent={totals.sent} clicked={totals.clicked} openedOnly={totals.openedOnly} maybe={totals.maybe} waiting={totals.waiting} />
          <Trend sent={trend.sent} opened={trend.opened} />
        </div>
      )}

      <section className="card results-list" aria-label="Emails">
        <div className="toolbar">
          <nav className="tabs" aria-label="Filter">
            {FILTERS.map((f) => (
              <Link key={f.key} href={href({ show: f.key === "all" ? "" : f.key })} data-k={f.key} aria-current={f.key === filter ? "true" : undefined}>
                {f.label}
                <span className="count">{counts[f.key]}</span>
              </Link>
            ))}
          </nav>
          <form className="search" action="/" role="search">
            {viewing !== me.id && <input type="hidden" name="user" value={viewing} />}
            {filter !== "all" && <input type="hidden" name="show" value={filter} />}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M20 20l-4-4" />
            </svg>
            <input id="q" className="input" type="search" name="q" defaultValue={search} placeholder="Search people or subjects" aria-label="Search people or subjects" />
          </form>
        </div>

        {rows.length === 0 ? (
          totals.total === 0 ? (
            viewingSelf ? (
              <ResultsEmpty title="No tracked emails yet" action={<TrackButton>Track your first email</TrackButton>}>
                Write your email in Gmail as usual, then add a tracking picture here. It takes about ten seconds.
              </ResultsEmpty>
            ) : (
              <ResultsEmpty title="Nothing tracked yet">
                {viewingPerson.name} hasn&apos;t tracked any emails yet.
              </ResultsEmpty>
            )
          ) : (
            <ResultsEmpty
              title="Nothing matches"
              action={
                <Link href={href({ show: "", q: "" })} className="btn">
                  Show all emails
                </Link>
              }
            >
              {search ? `No emails match “${search}”${filter !== "all" ? " with this filter" : ""}. Try other words or a different filter.` : "No emails with this status yet."}
            </ResultsEmpty>
          )
        ) : (
          <>
            <div className="table-wrap">
              <table className="results-table">
                <thead>
                  <tr>
                    <th className="c-who">Sent to</th>
                    <th className="c-about hide-sm">About</th>
                    <th className="c-status">Status</th>
                    <th className="c-when hide-sm">Sent</th>
                    <th className="c-when c-first">First opened</th>
                    <th className="c-n r hide-sm">Opens</th>
                    <th className="c-n r hide-sm">Clicks</th>
                    <th className="c-pts r hide-sm">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/emails/${r.id}`} className="row-link who">
                          <b title={r.recipientName || r.recipientEmail}>{r.recipientName || r.recipientEmail}</b>
                          {r.recipientName && <span title={r.recipientEmail}>{r.recipientEmail}</span>}
                          {r.label && <span className="about-sm">{r.label}</span>}
                        </Link>
                      </td>
                      <td className="hide-sm">
                        {r.label ? <span className="about" title={r.label}>{r.label}</span> : <span className="faint">—</span>}
                      </td>
                      <td>
                        <StatusTag status={r.status} />
                      </td>
                      <td className="hide-sm muted num c-when">
                        <When at={iso(r.sentAt)} />
                      </td>
                      <td className="num c-first">
                        <When at={iso(r.firstOpenAt)} />
                      </td>
                      <td className="r num hide-sm">
                        <CountMark kind="opens" n={r.openCount} />
                      </td>
                      <td className="r num hide-sm">
                        <CountMark kind="clicks" n={r.clickCount} />
                      </td>
                      <td className="r hide-sm">
                        <span className="pts tip-right" data-tip={emailPointsNote(r.status)}>
                          <PointChip points={r.status === "draft" ? 0 : pointsForEmail(r.status)} size="sm" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="results-foot">
              <span className="num">{shown}</span>
              <TimeZoneNote className="results-zone" />
            </div>
          </>
        )}
      </section>
    </>
  );
}
