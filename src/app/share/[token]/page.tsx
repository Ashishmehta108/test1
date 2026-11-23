import { desc, eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { OpensChart } from "@/components/email/OpensChart";
import { CardHead, Empty, PageHead, Stat, Stats, StatusTag } from "@/components/ui";
import { TimeZoneNote, When } from "@/components/When";
import { getDb } from "@/db";
import { clickEvents, emails, links, openEvents } from "@/db/schema";
import { iso } from "@/lib/format";

// Anyone with the link can see this page, so keep it out of search engines and
// don't send the link address to other sites that the page might link to.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type EventType = "open" | "click";

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9A-Za-z]{32}$/.test(token)) notFound();

  // Only the fields below are read. No IP addresses, browsers, tracking token or owner details.
  const db = await getDb();
  const opens = db
    .select({
      type: sql<EventType>`'open'`.as("type"),
      at: openEvents.at,
      kind: openEvents.kind,
      url: sql<string | null>`null::text`.as("url"),
    })
    .from(openEvents)
    .innerJoin(emails, eq(emails.id, openEvents.emailId))
    .where(sql`${emails.shareToken} = ${token} and ${openEvents.kind} in ('real','maybe')`);
  const clicks = db
    .select({
      type: sql<EventType>`'click'`.as("type"),
      at: clickEvents.at,
      kind: clickEvents.kind,
      url: sql<string | null>`${links.url}`.as("url"),
    })
    .from(clickEvents)
    .innerJoin(emails, eq(emails.id, clickEvents.emailId))
    .leftJoin(links, eq(links.id, clickEvents.linkId))
    .where(sql`${emails.shareToken} = ${token} and ${clickEvents.kind} in ('real','maybe')`);

  const [[email], events] = await Promise.all([
    db
      .select({
        recipientEmail: emails.recipientEmail,
        recipientName: emails.recipientName,
        label: emails.label,
        status: emails.status,
        sentAt: emails.sentAt,
        firstOpenAt: emails.firstOpenAt,
        lastOpenAt: emails.lastOpenAt,
        openCount: emails.openCount,
        clickCount: emails.clickCount,
      })
      .from(emails)
      .where(eq(emails.shareToken, token))
      .limit(1),
    opens.unionAll(clicks).orderBy(desc(sql`at`)).limit(200),
  ]);
  if (!email) notFound();

  const displayName = email.recipientName || email.recipientEmail;
  const firstName = email.recipientName?.split(" ")[0] || "";
  // The chart uses only real opens and clicks from the list above (the newest 200 at most).
  const real = events.filter((ev) => ev.kind === "real");

  return (
    <main className="main share-main">
      <div className="brand share-brand">
        <BrandMark />
        Open Tracker
      </div>

      <PageHead
        title={displayName}
        tag={<StatusTag status={email.status} />}
        sub={
          <>
            {email.recipientName ? `${email.recipientEmail} · ` : ""}
            {email.label || "No subject added"}
          </>
        }
      />

      <Stats label="This email's numbers" cols={4}>
        <Stat label="Times opened" value={<span className="num">{email.openCount}</span>} sub={email.openCount ? undefined : "Not opened yet"} />
        <Stat label="Link clicks" value={<span className="num">{email.clickCount}</span>} />
        <Stat label="First opened" value={<span className="stat-when"><When at={iso(email.firstOpenAt)} /></span>} />
        <Stat label="Last opened" value={<span className="stat-when"><When at={iso(email.lastOpenAt)} /></span>} />
      </Stats>

      {email.openCount > 0 && email.sentAt && (
        <OpensChart
          sentAt={iso(email.sentAt)!}
          opens={real.filter((ev) => ev.type === "open").map((ev) => iso(ev.at)!)}
          clicks={real.filter((ev) => ev.type === "click").map((ev) => iso(ev.at)!)}
        />
      )}

      <section className="card" aria-label="Activity">
        <CardHead title="Activity" aside="Newest first" />
        {events.length === 0 ? (
          <Empty title="No opens yet" small>
            When {firstName || "they"} open{firstName ? "s" : ""} the email, it&apos;ll show up here.
          </Empty>
        ) : (
          <ol className="timeline">
            {events.map((ev, i) => {
              const title =
                ev.type === "click"
                  ? `Clicked ${ev.url ? ev.url.replace(/^https?:\/\//, "").replace(/\/$/, "") : "a link"}`
                  : ev.kind === "real"
                    ? "Opened"
                    : "Maybe opened";
              const dot = ev.kind === "maybe" ? "maybe" : ev.type === "click" ? "click" : "real";
              return (
                <li key={i} className={`tl-item ${ev.kind}`}>
                  <span className={`tl-dot ${dot}`} aria-hidden="true" />
                  <div className="tl-main">
                    <b>{title}</b>
                    <span>
                      <When at={iso(ev.at)} />
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <TimeZoneNote className="quiet-note" />
      </section>

      <p className="share-foot">Someone shared these results with you. Refresh the page to see anything new.</p>
    </main>
  );
}
