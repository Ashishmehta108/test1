import { and, desc, eq, gte, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { deleteEmail, ignoreEvent, markNotSent, markSent } from "@/app/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CopyLinkButton, CopyPictureButton } from "@/components/Copy";
import { OpensChart } from "@/components/email/OpensChart";
import { EmailPoints } from "@/components/game/EmailPoints";
import { SendSteps } from "@/components/email/SendSteps";
import { Markdown } from "@/components/Markdown";
import { ShareCard } from "@/components/Share";
import { SubmitButton } from "@/components/SubmitButton";
import { TimeZoneNote, When } from "@/components/When";
import { ResultsEmpty } from "@/components/results/ResultsEmpty";
import { CardHead, PageHead, Stat, Stats, StatusTag } from "@/components/ui";
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

  return (
    <>
      <PageHead
        back={{ href: isMine ? "/" : `/?user=${email.ownerId}`, label: isMine ? "Results" : `${email.ownerName}'s results` }}
        title={displayName}
        tag={<StatusTag status={email.status} />}
        sub={
          <>
            {email.recipientName ? `${email.recipientEmail} · ` : ""}
            {email.label || "No subject added"}
          </>
        }
      />

      {sent && (
        <Stats label="This email's numbers" cols={email.maybeCount > 0 ? 5 : 4}>
          <Stat label="Times opened" value={<span className="num">{email.openCount}</span>} sub={email.openCount ? undefined : "Not opened yet"} />
          <Stat
            label="Link clicks"
            value={<span className="num">{email.clickCount}</span>}
            sub={links.length ? `${plural(links.length, "tracked link")}` : "No tracked links"}
          />
          <Stat label="First opened" value={<span className="stat-when"><When at={iso(email.firstOpenAt)} /></span>} />
          <Stat label="Last opened" value={<span className="stat-when"><When at={iso(email.lastOpenAt)} /></span>} />
          {email.maybeCount > 0 && (
            <Stat label="Maybe opened" value={<span className="num">{email.maybeCount}</span>} sub="Not counted as opens" />
          )}
        </Stats>
      )}

      <div className="email-grid">
        <div className="stack">
          {!sent ? (
            <SendSteps
              pixelUrl={pixelUrl}
              firstName={firstName || "this person"}
              links={links.map((l) => ({ id: l.id, url: l.url, trackedUrl: tracked(l.position) }))}
              worth={`Worth ${POINTS_SENT} point${isMine ? "" : ` to ${email.ownerName.split(" ")[0]}`} now, ${POINTS_OPENED} more when it's opened.`}
              sendForm={
                <form action={markSent.bind(null, email.id)} className="actions">
                  <SubmitButton className="btn btn-primary" pendingText="Saving…">
                    I&apos;ve sent it
                  </SubmitButton>
                </form>
              }
            />
          ) : (
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
                        const ignored = ev.kind === "ignored";
                        const what = ev.type === "click" ? `Clicked ${ev.url ? bare(ev.url) : "a link"}` : ev.kind === "maybe" ? "Maybe opened" : "Opened";
                        const dot = ignored ? "ignored" : ev.kind === "maybe" ? "maybe" : ev.type === "click" ? "click" : "real";
                        return (
                          <li key={`${ev.type}-${ev.id}`} className={`tl-item ${ev.kind}`}>
                            <span className={`tl-dot ${dot}`} aria-hidden="true" />
                            <div className="tl-main">
                              <b>
                                {what}
                                {ignored && <span className="pill">Not counted</span>}
                              </b>
                              <span>
                                <When at={iso(ev.at)} /> · {ev.reason || deviceName(ev.userAgent)}
                              </span>
                            </div>
                            {!ignored && (
                              <form action={ignoreEvent.bind(null, email.id, ev.type, ev.id)} className="inline-form">
                                <SubmitButton className="btn btn-sm me-btn" pendingText="Saving…" aria-label={`That was me: ${what}`}>
                                  That was me
                                </SubmitButton>
                              </form>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </>
                )}
                <TimeZoneNote className="quiet-note" />
              </section>
            </>
          )}

          {email.notes && (
            <section className="card" aria-labelledby="notes-heading">
              <div className="card-head">
                <h2 id="notes-heading">Notes</h2>
                <span className="aside">Only you and your admin see these</span>
              </div>
              <Markdown text={email.notes} className="md-pad" />
            </section>
          )}

          {localhost && (
            <p className="small faint">
              You&apos;re running the tracker on this computer, so the picture only works for you. Once it&apos;s online, it works for everyone you email.
            </p>
          )}
        </div>

        <aside className="email-side">
          <section className="card" aria-label="Details">
            <dl className="facts">
              <div className="fact">
                <dt>Sent</dt>
                <dd>
                  <When at={iso(email.sentAt)} fallback="Not yet" />
                </dd>
              </div>
              <div className="fact">
                <dt>To</dt>
                <dd className="fact-long" title={email.recipientEmail}>{email.recipientEmail}</dd>
              </div>
              {!isMine && (
                <div className="fact">
                  <dt>Sent by</dt>
                  <dd>{email.ownerName}</dd>
                </div>
              )}
              <div className="fact">
                <dt>Tracked links</dt>
                <dd>{links.length || "None"}</dd>
              </div>
            </dl>
          </section>

          <EmailPoints status={email.status} owner={isMine ? undefined : email.ownerName.split(" ")[0]} />

          <ShareCard emailId={email.id} shareUrl={email.shareToken ? `${base}/share/${email.shareToken}` : null} />

          {sent && (
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
          )}

          <div className="side-quiet">
            {sent && (
              <form action={markNotSent.bind(null, email.id)} className="inline-form">
                <SubmitButton className="btn btn-quiet btn-sm" pendingText="Saving…">
                  Mark as not sent
                </SubmitButton>
              </form>
            )}
            <form action={deleteEmail.bind(null, email.id)} className="inline-form">
              <ConfirmButton className="btn btn-quiet btn-sm btn-danger" label="Delete" confirmLabel="Click again to delete" pendingText="Deleting…" />
            </form>
          </div>
        </aside>
      </div>
    </>
  );
}
