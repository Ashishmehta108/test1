"use client";

import { useOptimistic, type ReactNode } from "react";
import { deleteEmail, markNotSent, markSent } from "@/app/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { SendSteps } from "@/components/email/SendSteps";
import { EmailPoints } from "@/components/game/EmailPoints";
import { SubmitButton } from "@/components/SubmitButton";
import { When } from "@/components/When";
import { PageHead, StatusTag } from "@/components/ui";
import type { Status } from "@/db/schema";

type Shown = { sentAt: string | null; status: Status };

type Props = {
  emailId: string;
  /** From the server: when it was sent (ISO text), or null if not yet. */
  sentAt: string | null;
  status: Status;
  head: { back: { href: string; label: string }; title: string; sub: ReactNode };
  /** The numbers row. Only shown once the email is sent. */
  stats: ReactNode;
  /** The chart and the Activity list. Only shown once the email is sent. */
  activity: ReactNode;
  /** The three "how to send" steps. Only shown until the email is sent. */
  steps: { pixelUrl: string; firstName: string; links: { id: number; url: string; trackedUrl: string }[]; worth: string };
  /** The "Need the picture again?" card. Only shown once sent. */
  picture: ReactNode;
  share: ReactNode;
  notes: ReactNode;
  footer: ReactNode;
  recipientEmail: string;
  /** Set when an admin is looking at someone else's email. */
  sentBy?: string;
  linkCount: number;
  /** First name of whose points these are, when not the viewer's own. */
  pointsOwner?: string;
};

/**
 * The single-email page's interactive part. The three buttons (I've sent it, Mark as not
 * sent, Delete) change the screen at once, then the server saves and the real values
 * replace these if anything differs.
 */
export function EmailDetail(p: Props) {
  const server: Shown = { sentAt: p.sentAt, status: p.status };
  const [shown, showChange] = useOptimistic(server);
  const [deleting, markDeleting] = useOptimistic(false);
  const sent = Boolean(shown.sentAt);

  async function sendNow() {
    showChange({ sentAt: shown.sentAt ?? new Date().toISOString(), status: shown.status === "draft" ? "sent" : shown.status });
    await markSent(p.emailId);
  }

  async function notSentNow() {
    showChange({ sentAt: null, status: "draft" });
    await markNotSent(p.emailId);
  }

  async function deleteNow() {
    markDeleting(true);
    await deleteEmail(p.emailId);
  }

  return (
    <>
      <PageHead back={p.head.back} title={p.head.title} tag={<StatusTag status={shown.status} />} sub={p.head.sub} />

      <div aria-busy={deleting || undefined} style={deleting ? { opacity: 0.4, pointerEvents: "none" } : undefined}>
        {deleting && (
          <p className="small muted" role="status">
            Deleting…
          </p>
        )}

        {sent && p.stats}

        <div className="email-grid">
          <div className="stack">
            {!sent ? (
              <SendSteps
                pixelUrl={p.steps.pixelUrl}
                firstName={p.steps.firstName}
                links={p.steps.links}
                worth={p.steps.worth}
                sendForm={
                  <form action={sendNow} className="actions">
                    <SubmitButton className="btn btn-primary" pendingText="Saving…">
                      I&apos;ve sent it
                    </SubmitButton>
                  </form>
                }
              />
            ) : (
              p.activity
            )}

            {p.notes}
            {p.footer}
          </div>

          <aside className="email-side">
            <section className="card" aria-label="Details">
              <dl className="facts">
                <div className="fact">
                  <dt>Sent</dt>
                  <dd>
                    <When at={shown.sentAt} fallback="Not yet" />
                  </dd>
                </div>
                <div className="fact">
                  <dt>To</dt>
                  <dd className="fact-long" title={p.recipientEmail}>
                    {p.recipientEmail}
                  </dd>
                </div>
                {p.sentBy && (
                  <div className="fact">
                    <dt>Sent by</dt>
                    <dd>{p.sentBy}</dd>
                  </div>
                )}
                <div className="fact">
                  <dt>Tracked links</dt>
                  <dd>{p.linkCount || "None"}</dd>
                </div>
              </dl>
            </section>

            <EmailPoints status={shown.status} owner={p.pointsOwner} />

            {p.share}

            {sent && p.picture}

            <div className="side-quiet">
              {sent && (
                <form action={notSentNow} className="inline-form">
                  <SubmitButton className="btn btn-quiet btn-sm" pendingText="Saving…">
                    Mark as not sent
                  </SubmitButton>
                </form>
              )}
              <form action={deleteNow} className="inline-form">
                <ConfirmButton className="btn btn-quiet btn-sm btn-danger" label="Delete" confirmLabel="Click again to delete" pendingText="Deleting…" />
              </form>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
