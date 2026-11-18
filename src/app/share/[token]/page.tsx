import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StatusTag } from "@/components/ui";
import { When } from "@/components/When";
import { one, q } from "@/lib/db";
import { iso } from "@/lib/format";
import type { Status } from "@/lib/track";

// Anyone with the link can see this page, so keep it out of search engines and
// don't send the link address to other sites that the page might link to.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type SharedEmail = {
  recipient_email: string;
  recipient_name: string | null;
  label: string | null;
  status: Status;
  first_open_at: Date | string | null;
  open_count: number;
  click_count: number;
};

type SharedEvent = {
  type: "open" | "click";
  at: Date | string;
  kind: "real" | "maybe";
  url: string | null;
};

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9A-Za-z]{32}$/.test(token)) notFound();

  // Only the fields below are read. No IP addresses, browsers, tracking token or owner details.
  const [email, events] = await Promise.all([
    one<SharedEmail>(
      `SELECT recipient_email, recipient_name, label, status, first_open_at, open_count, click_count
         FROM emails WHERE share_token = $1`,
      [token],
    ),
    q<SharedEvent>(
      `SELECT 'open' AS type, ev.at, ev.kind, NULL AS url
         FROM open_events ev JOIN emails e ON e.id = ev.email_id
        WHERE e.share_token = $1 AND ev.kind IN ('real','maybe')
       UNION ALL
       SELECT 'click' AS type, c.at, c.kind, l.url
         FROM click_events c
         JOIN emails e ON e.id = c.email_id
         LEFT JOIN links l ON l.id = c.link_id
        WHERE e.share_token = $1 AND c.kind IN ('real','maybe')
       ORDER BY at DESC
       LIMIT 200`,
      [token],
    ),
  ]);
  if (!email) notFound();

  const displayName = email.recipient_name || email.recipient_email;

  return (
    <main className="main" style={{ maxWidth: 720 }}>
      <div className="brand">
        <span className="brand-mark" aria-hidden="true" />
        Open Tracker
      </div>

      <div className="page-head">
        <div className="titles">
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1>{displayName}</h1>
            <StatusTag status={email.status} />
          </div>
          <p className="muted">
            {email.recipient_name ? `${email.recipient_email} · ` : ""}
            {email.label || "No subject added"}
          </p>
        </div>
      </div>

      <section className="card">
        <dl className="facts" style={{ margin: 0 }}>
          <div className="fact">
            <dt>First opened</dt>
            <dd>
              <When at={iso(email.first_open_at)} fallback="Not yet" />
            </dd>
          </div>
          <div className="fact">
            <dt>Times opened</dt>
            <dd>{email.open_count}</dd>
          </div>
          <div className="fact">
            <dt>Link clicks</dt>
            <dd>{email.click_count}</dd>
          </div>
        </dl>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Activity</h2>
          <span className="small faint">Newest first</span>
        </div>
        {events.length === 0 ? (
          <div className="empty" style={{ padding: "40px 24px" }}>
            <p>Nothing yet.</p>
          </div>
        ) : (
          <ol className="timeline">
            {events.map((ev, i) => {
              const title =
                ev.type === "click"
                  ? `Clicked ${ev.url ? ev.url.replace(/^https?:\/\//, "") : "a link"}`
                  : ev.kind === "real"
                    ? "Opened"
                    : "Maybe opened";
              const dot = ev.type === "click" ? "click" : ev.kind === "maybe" ? "maybe" : "real";
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
      </section>

      <p className="small faint">Shared view — updates automatically when you refresh.</p>
    </main>
  );
}
