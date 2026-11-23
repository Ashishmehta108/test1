"use client";

import { useState, type ReactNode } from "react";
import { CopyLinkButton, CopyPictureButton, PasteCheck } from "@/components/Copy";
import { ResultIcon } from "@/components/results/icons";

type TrackedLink = { id: number | string; url: string; trackedUrl: string };

/**
 * The three things to do before an email counts: copy the tracking picture, paste it into
 * Gmail, then say it was sent. Copying the picture ticks off the first step and moves the
 * highlight to the next one, so it is always clear what to do now.
 */
export function SendSteps({
  pixelUrl,
  firstName,
  links,
  worth,
  sendForm,
}: {
  pixelUrl: string;
  firstName: string;
  links: TrackedLink[];
  /** What pressing "I've sent it" earns, in one plain line. */
  worth?: string;
  /** The "I've sent it" form (a server action), rendered in step 3. */
  sendForm: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const done = () => setCopied(true);

  return (
    <section className="card steps" aria-label="How to send this email">
      <ol className="step-list">
        <li className={`step ${copied ? "done" : "current"}`} aria-current={copied ? undefined : "step"}>
          <span className="step-n" aria-hidden="true">
            {copied ? <ResultIcon name="check" size={16} stroke={2.2} /> : "1"}
          </span>
          <div className="step-body">
            <h3>
              Copy the tracking picture
              {copied && <span className="sr-only"> (done)</span>}
            </h3>
            <p>It&apos;s a single invisible dot, made just for {firstName}. Use it in this one email only.</p>
            <div className="actions">
              <CopyPictureButton src={pixelUrl} primary={!copied} onCopied={done} />
            </div>
            <PasteCheck onOk={done} />
          </div>
        </li>

        <li className={`step ${copied ? "current" : ""}`} aria-current={copied ? "step" : undefined}>
          <span className="step-n" aria-hidden="true">2</span>
          <div className="step-body">
            <h3>Paste it at the end of your Gmail message</h3>
            <p>
              Click just below your signature and paste (⌘V or Ctrl+V). Nothing will seem to appear. That&apos;s expected: the
              picture is invisible.
            </p>
            {links.length > 0 && (
              <div className="step-links">
                <p>Use {links.length === 1 ? "this link" : "these links"} in place of your normal ones, so clicks are counted too:</p>
                <ul className="link-list">
                  {links.map((l) => (
                    <li className="link-item" key={l.id}>
                      <span className="url" title={l.url}>
                        {l.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </span>
                      <CopyLinkButton trackedUrl={l.trackedUrl} originalUrl={l.url} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </li>

        <li className="step">
          <span className="step-n" aria-hidden="true">3</span>
          <div className="step-body">
            <h3>Send it from Gmail, then come back and press this</h3>
            <p>Opens only start counting from here, so your own look at the email while writing it never counts.</p>
            {sendForm}
            {worth && <p className="step-worth">{worth}</p>}
          </div>
        </li>
      </ol>
    </section>
  );
}
