import { and, desc, eq, gte, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CopyLinkButton, CopyPictureButton } from "@/components/Copy";
import { OpensChart } from "@/components/email/OpensChart";
import { EventRow } from "@/components/email/EventRow";
import { EmailDetail } from "@/components/email/EmailDetail";
import { Markdown } from "@/components/Markdown";
import { ShareCard } from "@/components/Share";
import { TimeZoneNote, When } from "@/components/When";
import { ResultsEmpty } from "@/components/results/ResultsEmpty";
import { Stat, Stats } from "@/components/ui";
import { getDb } from "@/db";
import { clickEvents, emails, links, openEvents, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { deviceName, iso } from "@/lib/format";
import { POINTS_OPENED, POINTS_SENT } from "@/lib/game";
import { baseUrl } from "@/lib/request";

type EventType = "open" | "click";

/** Everything this page shows, fetched at the same time (one wait instead of several). */
async function load(id: string) {
  const db = await getDb();

  const opens = db
    .select({
      id: openEvents.id,
      type: sql<EventType>`'open'`.as("type"),
      at: openEvents.at,
      userAgent: openEvents.userAgent,
      kind: openEvents.kind,
      reason: openEvents.reason,
      url: sql<string | null>`null::text`.as("url"),
    })
    .from(openEvents)
    .where(eq(openEvents.emailId, id));
  const clicks = db
    .select({
      id: clickEvents.id,
      type: sql<EventType>`'click'`.as("type"),
      at: clickEvents.at,
      userAgent: clickEvents.userAgent,
      kind: clickEvents.kind,
      reason: clickEvents.reason,
      url: sql<string | null>`${links.url}`.as("url"),
    })
    .from(clickEvents)
    .leftJoin(links, eq(links.id, clickEvents.linkId))
    .where(eq(clickEvents.emailId, id));

  // Real opens and clicks of the last 31 days, for the "Opens over time" chart.
  // The browser sorts them into the viewer's own days.
  const since = sql`now() - interval '31 days'`;
  const recentOpens = db
    .select({ at: openEvents.at })
    .from(openEvents)
    .where(and(eq(openEvents.emailId, id), eq(openEvents.kind, "real"), gte(openEvents.at, since)))
    .limit(5000);
  const recentClicks = db
    .select({ at: clickEvents.at })
    .from(clickEvents)
    .where(and(eq(clickEvents.emailId, id), eq(clickEvents.kind, "real"), gte(clickEvents.at, since)))
    .limit(5000);

  const [[email], linkRows, events, opensByDay, clicksByDay] = await Promise.all([
    db
      .select({
        id: emails.id,
        ownerId: emails.ownerId,
        ownerName: users.name,
        token: emails.token,
        recipientEmail: emails.recipientEmail,
        recipientName: emails.recipientName,
        label: emails.label,
        status: emails.status,
        sentAt: emails.sentAt,
        firstOpenAt: emails.firstOpenAt,
        lastOpenAt: emails.lastOpenAt,
        openCount: emails.openCount,
        maybeCount: emails.maybeCount,
        clickCount: emails.clickCount,
        shareToken: emails.shareToken,
        notes: emails.notes,
      })
      .from(emails)
      .innerJoin(users, eq(users.id, emails.ownerId))
      .where(eq(emails.id, id))
      .limit(1),
    db
      .select({
        id: links.id,
        position: links.position,
        url: links.url,
        clicks: sql<number>`count(*) filter (where ${clickEvents.kind} = 'real')`.mapWith(Number),
      })
      .from(links)
      .leftJoin(clickEvents, eq(clickEvents.linkId, links.id))
      .where(eq(links.emailId, id))
      .groupBy(links.id)
      .orderBy(links.position),
    opens.unionAll(clicks).orderBy(desc(sql`at`)).limit(200),
    recentOpens,
    recentClicks,
  ]);
  return { email, links: linkRows, events, opensByDay, clicksByDay };
}

const bare = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default async function EmailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  const data = await load(id);
  const { email, links, events } = data;
  if (!email || (email.ownerId !== me.id && me.role !== "admin")) notFound();

  const base = baseUrl(await headers());
  const pixelUrl = `${base}/o/${email.token}.gif`;
  const sent = Boolean(email.sentAt);
  const isMine = email.ownerId === me.id;
  const displayName = email.recipientName || email.recipientEmail;
  const firstName = email.recipientName?.split(" ")[0] || "";
  const localhost = /\/\/(localhost|127\.0\.0\.1)/.test(base);
  const tracked = (position: number) => `${base}/c/${email.token}/${position}`;
  const anyCounted = events.some((ev) => ev.kind !== "ignored");

  // The pieces below are all built here, on the server. EmailDetail decides which ones to
  // show, so it can flip between "sent" and "not sent" the moment a button is pressed.
  const stats = (
    <Stats label="This email's numbers" cols={email.maybeCount > 0 ? 5 : 4}>
      <Stat label="Times opened" value={<span className="num">{email.openCount}</span>} sub={email.openCount ? undefined : "Not opened yet"} />
      <Stat
        label="Link clicks"
        value={<span className="num">{email.clickCount}</span>}
        sub={links.length ? `${plural(links.length, "tracked link")}` : "No tracked links"}
      />
      <Stat label="First opened" value={<span className="stat-when"><When at={iso(email.firstOpenAt)} /></span>} />
      <Stat label="Last opened" value={<span className="stat-when"><When at={iso(email.lastOpenAt)} /></span>} />
      {email.maybeCount > 0 && <Stat label="Maybe opened" value={<span className="num">{email.maybeCount}</span>} sub="Not counted as opens" />}
    </Stats>
  );

  const activity = (
    <>
      {email.openCount > 0 && email.sentAt && (
        <OpensChart
          sentAt={iso(email.sentAt)!}
          opens={data.opensByDay.map((r) => iso(r.at)!)}
          clicks={data.clicksByDay.map((r) => iso(r.at)!)}
        />
      )}

      <section className="card" aria-labelledby="activity-heading">
        <div className="card-head">
          <h2 id="activity-heading">Activity</h2>
          <span className="aside">Newest first</span>
        </div>
        {events.length === 0 ? (
          <ResultsEmpty title="No opens yet" small>
            When {firstName || "they"} open{firstName ? "s" : ""} the email, it&apos;ll show up here. Some people take a day or two.
          </ResultsEmpty>
        ) : (
          <>
            {anyCounted && (
              <p className="tl-hint">
                {isMine
                  ? "Opened your own sent email in Gmail? Press “That was me” next to it and it won't be counted."
                  : `If ${email.ownerName} opened their own sent email, press “That was me” next to it and it won't be counted.`}
              </p>
            )}
            <ol className="timeline">
              {events.map((ev) => {
                const what = ev.type === "click" ? `Clicked ${ev.url ? bare(ev.url) : "a link"}` : ev.kind === "maybe" ? "Maybe opened" : "Opened";
                return (
                  <EventRow
                    key={`${ev.type}-${ev.id}`}
                    emailId={email.id}
                    id={ev.id}
                    type={ev.type}
                    kind={ev.kind}
                    what={what}
                    at={iso(ev.at) ?? null}
                    detail={ev.reason || deviceName(ev.userAgent)}
                  />
                );
              })}
            </ol>
          </>
        )}
        <TimeZoneNote className="quiet-note" />
      </section>
    </>
  );

  const picture = (
    <section className="card" aria-labelledby="again-heading">
      <div className="card-head">
        <h2 id="again-heading">Need the picture again?</h2>
      </div>
      <div className="again-body">
        <p className="small muted">In case it didn't make it into the email you sent.</p>
        <div className="actions">
          <CopyPictureButton src={pixelUrl} primary={false} />
        </div>
      </div>
      {links.length > 0 && (
        <ul className="link-rows" aria-label="Tracked links">
          {links.map((l) => (
            <li key={l.id}>
              <span className="url" title={l.url}>
                {bare(l.url)}
              </span>
              <span className={`clicks num${l.clicks ? " has" : ""}`}>{plural(l.clicks, "click")}</span>
              <CopyLinkButton trackedUrl={tracked(l.position)} originalUrl={l.url} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  const notes = email.notes ? (
    <section className="card" aria-labelledby="notes-heading">
      <div className="card-head">
        <h2 id="notes-heading">Notes</h2>
        <span className="aside">Only you and your admin see these</span>
      </div>
      <Markdown text={email.notes} className="md-pad" />
    </section>
  ) : null;

  const footer = localhost ? (
    <p className="small faint">
      You&apos;re running the tracker on this computer, so the picture only works for you. Once it&apos;s online, it works for everyone you email.
    </p>
  ) : null;

  return (
    <EmailDetail
      emailId={email.id}
      sentAt={iso(email.sentAt) ?? null}
      status={email.status}
      head={{
        back: { href: isMine ? "/" : `/?user=${email.ownerId}`, label: isMine ? "Results" : `${email.ownerName}'s results` },
        title: displayName,
        sub: (
          <>
            {email.recipientName ? `${email.recipientEmail} · ` : ""}
            {email.label || "No subject added"}
          </>
        ),
      }}
      stats={stats}
      activity={activity}
      steps={{
        pixelUrl,
        firstName: firstName || "this person",
        links: links.map((l) => ({ id: l.id, url: l.url, trackedUrl: tracked(l.position) })),
        worth: `Worth ${POINTS_SENT} point${isMine ? "" : ` to ${email.ownerName.split(" ")[0]}`} now, ${POINTS_OPENED} more when it's opened.`,
      }}
      picture={picture}
      share={<ShareCard emailId={email.id} shareUrl={email.shareToken ? `${base}/share/${email.shareToken}` : null} />}
      notes={notes}
      footer={footer}
      recipientEmail={email.recipientEmail}
      sentBy={isMine ? undefined : email.ownerName}
      linkCount={links.length}
      pointsOwner={isMine ? undefined : email.ownerName.split(" ")[0]}
    />
  );
}
