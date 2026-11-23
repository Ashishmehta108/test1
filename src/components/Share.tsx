"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { disableShare, enableShare, renewShare } from "@/app/share-actions";
import { ConfirmButton } from "./ConfirmButton";
import "./share.css";

/** A button that shows a short "working" label while its form is being sent. */
function PendingButton({ idle, busy, className }: { idle: string; busy: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? busy : idle}
    </button>
  );
}

/** Lets the sender turn a private, view-only link to this email's results on or off. */
export function ShareCard({ emailId, shareUrl }: { emailId: string; shareUrl: string | null }) {
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const [canShare, setCanShare] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (copied === "idle") return;
    const t = window.setTimeout(() => setCopied("idle"), 2200);
    return () => window.clearTimeout(t);
  }, [copied]);

  if (!shareUrl) {
    return (
      <section className="card" aria-labelledby="share-heading">
        <div className="card-head">
          <h2 id="share-heading">Share these results</h2>
        </div>
        <div className="share-card">
          <p className="share-text">Make a private link so someone else can see these results. They don&apos;t need to sign in.</p>
          <form action={enableShare.bind(null, emailId)}>
            <PendingButton className="btn" idle="Create share link" busy="Creating link…" />
          </form>
        </div>
      </section>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied("done");
    } catch {
      // Clipboard blocked: select the link so it can be copied by hand.
      inputRef.current?.select();
      setCopied("failed");
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: "Email results", url: shareUrl });
    } catch {
      /* closed the sheet, nothing to do */
    }
  };

  return (
    <section className="card" aria-labelledby="share-heading">
      <div className="card-head">
        <h2 id="share-heading">Share these results</h2>
        <span className="share-on">Link is on</span>
      </div>
      <div className="share-card">
        <p className="share-text">Anyone with this link can see these results, but not your notes. They don&apos;t need to sign in.</p>

        <div className="share-row">
          <input
            ref={inputRef}
            className="input share-input"
            readOnly
            value={shareUrl}
            aria-label="Share link"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button type="button" className={`btn ${copied === "done" ? "done" : "btn-primary"}`} onClick={copy}>
            {copied === "done" ? "Copied" : "Copy link"}
          </button>
        </div>

        {copied === "failed" && (
          <p className="share-note share-note-bad">Couldn&apos;t copy. The link is selected, so press ⌘C or Ctrl+C.</p>
        )}

        {canShare && (
          <div className="actions">
            <button type="button" className="btn btn-sm" onClick={share}>
              Share…
            </button>
          </div>
        )}

        <div className="share-quiet">
          <form action={renewShare.bind(null, emailId)} className="inline-form">
            <ConfirmButton className="btn btn-quiet btn-sm" label="New link" confirmLabel="Click again for a new link" />
          </form>
          <form action={disableShare.bind(null, emailId)} className="inline-form">
            <PendingButton className="btn btn-quiet btn-sm" idle="Stop sharing" busy="Stopping…" />
          </form>
        </div>
        <p className="share-note">A new link makes the old one stop working.</p>
      </div>
    </section>
  );
}
