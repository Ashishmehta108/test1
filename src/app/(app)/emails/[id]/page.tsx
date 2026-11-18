import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteEmail, ignoreEvent, markNotSent, markSent } from "@/app/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ShareCard } from "@/components/Share";
import { CopyLinkButton, CopyPictureButton, PasteCheck } from "@/components/Copy";
import { IconBack, IconSend } from "@/components/Icons";
import { When } from "@/components/When";
import { StatusTag } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { one, q } from "@/lib/db";
import { deviceName, iso } from "@/lib/format";
import { baseUrl } from "@/lib/request";
import type { EventKind, Status } from "@/lib/track";

type Email = {
  id: string;
  owner_id: string;
  owner_name: string;
  token: string;
  recipient_email: string;
  recipient_name: string | null;
  label: string | null;
  status: Status;
  created_at: Date;
  sent_at: Date | null;
  first_open_at: Date | null;
  last_open_at: Date | null;
  open_count: number;
  maybe_count: number;
  click_count: number;
  share_token: string | null;
};

type Event = {
  id: string;
  type: "open" | "click";
  at: Date;
  user_agent: string | null;
  kind: EventKind;
  reason: string | null;
  url: string | null;
};

export default async function EmailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;

  // Everything the page needs is fetched at the same time (one wait instead of three).
  const [email, links, events] = await Promise.all([
    one<Email>(
      `SELECT e.*, u.name AS owner_name FROM emails e JOIN users u ON u.id = e.owner_id WHERE e.id = $1`,
      [id],
    ),
    q<{ id: number; position: number; url: string; clicks: number }>(
      `SELECT l.id, l.position, l.url,
              (SELECT CAST(count(*) AS integer) FROM click_events c WHERE c.link_id = l.id AND c.kind = 'real') AS clicks
         FROM links l WHERE l.email_id = $1 ORDER BY l.position`,
      [id],
    ),
    q<Event>(
      `SELECT CAST(id AS text) AS id, 'open' AS type, at, user_agent, kind, reason, NULL AS url FROM open_events WHERE email_id = $1
       UNION ALL
       SELECT CAST(c.id AS text) AS id, 'click' AS type, c.at, c.user_agent, c.kind, c.reason, l.url
         FROM click_events c LEFT JOIN links l ON l.id = c.link_id WHERE c.email_id = $1
       ORDER BY at DESC
       LIMIT 200`,
      [id],
    ),
  ]);
  if (!email || (email.owner_id !== me.id && me.role !== "admin")) notFound();

  const base = baseUrl(await headers());
  const pixelUrl = `${base}/o/${email.token}.gif`;
  const sent = Boolean(email.sent_at);
  const isMine = email.owner_id === me.id;
  const displayName = email.recipient_name || email.recipient_email;
  const localhost = /\/\/(localhost|127\.0\.0\.1)/.test(base);

  return (
    <>
      <div className="page-head">
        <div className="titles">
          <Link href={isMine ? "/" : `/?user=${email.owner_id}`} className="crumb">
            <IconBack /> {isMine ? "Results" : `${email.owner_name}'s results`}
          </Link>
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

      <div className="email-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
          {!sent ? (
            <section className="card steps" aria-label="How to send">
              <div className="step current">
                <div className="step-n">1</div>
                <div className="step-body">
                  <h3>Copy the tracking picture</h3>
                  <p>
                    It&apos;s a single invisible dot, made just for {email.recipient_name?.split(" ")[0] || "this person"}. Use it in one email only.
                  </p>
                  <div className="actions">
                    <CopyPictureButton src={pixelUrl} />
                  </div>
                  <PasteCheck />
                </div>
              </div>

              <div className="step">
                <div className="step-n">2</div>
                <div className="step-body">
                  <h3>Paste it at the end of your Gmail message</h3>
                  <p>
                    Click just below your signature and paste (⌘V or Ctrl+V). You won&apos;t see anything appear, and that&apos;s expected.
                  </p>
                  {links.length > 0 && (
                    <>
                      <p>Use these tracked links in place of your normal ones:</p>
                      <div className="link-list">
                        {links.map((l) => (
                          <div className="link-item" key={l.id}>
                            <span className="url" title={l.url}>
                              {l.url.replace(/^https?:\/\//, "")}
                            </span>
                            <CopyLinkButton trackedUrl={`${base}/c/${email.token}/${l.position}`} originalUrl={l.url} />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="step">
                <div className="step-n">3</div>
                <div className="step-body">
                  <h3>Send it from Gmail, then come back and press this</h3>
                  <p>Opens only start counting from here, so your own preview while writing never counts.</p>
                  <form action={markSent.bind(null, email.id)} className="actions">
                    <button type="submit" className="btn btn-primary">
                      <IconSend /> I&apos;ve sent it
                    </button>
                  </form>
                </div>
              </div>
            </section>
          ) : (
            <section className="card">
              <div className="card-head">
                <h2>Activity</h2>
                <span className="small faint">Newest first</span>
              </div>
              {events.length === 0 ? (
                <div className="empty" style={{ padding: "40px 24px" }}>
                  <p>
                    Nothing yet. When {email.recipient_name?.split(" ")[0] || "they"} open the email, it&apos;ll show up here.
                  </p>
                </div>
              ) : (
                <ol className="timeline">
                  {events.map((ev) => {
                    const title =
                      ev.type === "click"
                        ? `Clicked ${ev.url ? ev.url.replace(/^https?:\/\//, "") : "a link"}`
                        : ev.kind === "real"
                          ? "Opened"
                          : ev.kind === "maybe"
                            ? "Maybe opened"
                            : "Not counted";
                    const dot = ev.kind === "ignored" ? "ignored" : ev.kind === "maybe" ? "maybe" : ev.type === "click" ? "click" : "real";
                    return (
                      <li key={`${ev.type}-${ev.id}`} className={`tl-item ${ev.kind}`}>
                        <span className={`tl-dot ${dot}`} aria-hidden="true" />
                        <div className="tl-main">
                          <b>{title}</b>
                          <span>
                            <When at={iso(ev.at)} /> · {ev.reason || deviceName(ev.user_agent)}
                          </span>
                        </div>
                        {ev.kind !== "ignored" && (
                          <form action={ignoreEvent.bind(null, email.id, ev.type, ev.id)} className="inline-form">
                            <button type="submit" className="btn btn-quiet btn-sm" title="Don't count this. It wasn't them.">
                              That was me
                            </button>
                          </form>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          )}

          {localhost && (
            <p className="small faint">
              You&apos;re running the tracker on this computer, so the picture only works for you. Once it&apos;s online, it works for everyone you email.
            </p>
          )}
        </div>

        <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section className="card">
            <dl className="facts" style={{ margin: 0 }}>
              <div className="fact">
                <dt>Sent</dt>
                <dd>
                  <When at={iso(email.sent_at)} fallback="Not yet" />
                </dd>
              </div>
              <div className="fact">
                <dt>First opened</dt>
                <dd>
                  <When at={iso(email.first_open_at)} />
                </dd>
              </div>
              <div className="fact">
                <dt>Last opened</dt>
                <dd>
                  <When at={iso(email.last_open_at)} />
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
              {email.maybe_count > 0 && (
                <div className="fact">
                  <dt>Maybe opened</dt>
                  <dd>{email.maybe_count}</dd>
                </div>
              )}
              {!isMine && (
                <div className="fact">
                  <dt>Sent by</dt>
                  <dd>{email.owner_name}</dd>
                </div>
              )}
            </dl>
          </section>

          <ShareCard emailId={email.id} shareUrl={email.share_token ? `${base}/share/${email.share_token}` : null} />

          {sent && (
            <section className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h3>Need the picture again?</h3>
              <div className="actions">
                <CopyPictureButton src={pixelUrl} primary={false} />
              </div>
              {links.length > 0 && (
                <div className="link-list stacked">
                  {links.map((l) => (
                    <div className="link-item" key={l.id}>
                      <span className="url" title={l.url}>
                        {l.url.replace(/^https?:\/\//, "")}
                      </span>
                      <span className="clicks">
                        {l.clicks === 1 ? "1 click" : `${l.clicks} clicks`}
                      </span>
                      <CopyLinkButton trackedUrl={`${base}/c/${email.token}/${l.position}`} originalUrl={l.url} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <div className="actions">
            {sent && (
              <form action={markNotSent.bind(null, email.id)} className="inline-form">
                <button type="submit" className="btn btn-quiet btn-sm">
                  Mark as not sent
                </button>
              </form>
            )}
            <form action={deleteEmail.bind(null, email.id)} className="inline-form">
              <ConfirmButton className="btn btn-quiet btn-sm btn-danger" label="Delete" confirmLabel="Click again to delete" />
            </form>
          </div>
        </aside>
      </div>
    </>
  );
}
