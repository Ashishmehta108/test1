"use client";

import { usePathname } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createEmail, type TrackState } from "@/app/actions";
import { isEmail } from "@/lib/format";
import { POINTS_OPENED, POINTS_SENT } from "@/lib/game";
import { linksIn, MAX_NOTES, subjectOf } from "@/lib/notes";
import { FormModal, FormSection } from "./FormModal";
import { MarkdownTextarea } from "./MarkdownTextarea";

const OPEN_EVENT = "track-email:open";
const EXAMPLE = `Q4 offer for Priya

- Sent the new pricing: yourcompany.com/pricing
- Follow up on Friday if no reply`;

/** Any button that opens the "Track an email" form. */
export function TrackButton({ className = "btn btn-primary", children }: { className?: string; children: ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      {children}
    </button>
  );
}

/** The form itself. It lives once in the app shell and opens from any TrackButton. */
export function TrackEmailModal() {
  const [open, setOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState(false);
  const [state, action] = useActionState<TrackState, FormData>(createEmail, {});
  const emailRef = useRef<HTMLInputElement>(null);
  const path = usePathname();

  useEffect(() => {
    const show = () => {
      setTouched(false); // a fresh look each time it opens; what was typed is kept
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);

  // After saving, the app moves to the new email's steps page: close and clear the form.
  useEffect(() => {
    setOpen(false);
    setRecipient("");
    setNotes("");
    setTouched(false);
  }, [path]);

  const subject = useMemo(() => subjectOf(notes), [notes]);
  const links = useMemo(() => linksIn(notes), [notes]);
  const emailError = !recipient.trim()
    ? "Enter their email address."
    : !isEmail(recipient.trim())
      ? "That email address doesn't look right. It should look like priya@acme.com."
      : undefined;
  const shownEmailError = touched ? emailError : state.errors?.recipient;

  return (
    <FormModal
      open={open}
      onClose={() => setOpen(false)}
      title="Track an email"
      description="You'll get an invisible picture to paste into your Gmail message."
      size="full"
      action={action}
      onSubmit={(e) => {
        setTouched(true);
        if (emailError) {
          e.preventDefault();
          emailRef.current?.focus();
        }
      }}
      submitLabel="Create tracking picture"
      pendingText="Creating…"
      error={state.message}
      note={`Earns ${POINTS_SENT} point once sent, ${POINTS_OPENED} more when opened.`}
    >
      <div className="form-cols">
        <div className="form-main">
          <FormSection title="Who it's for" description="One tracking picture is made for this one person.">
            <div className="field">
              <label htmlFor="track-recipient">
                Their email address<span className="req" aria-hidden="true"> *</span>
              </label>
              <input
                ref={emailRef}
                id="track-recipient"
                name="recipient"
                type="email"
                className="input"
                required
                autoFocus
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="priya@acme.com"
                value={recipient}
                aria-invalid={shownEmailError ? true : undefined}
                aria-describedby={shownEmailError ? "track-recipient-error" : undefined}
                onChange={(e) => setRecipient(e.target.value)}
              />
              {shownEmailError && (
                <span className="error" id="track-recipient-error" role="alert">{shownEmailError}</span>
              )}
            </div>
          </FormSection>

          <FormSection title="Notes" description="Optional. Their name, what the email is about, anything you want to remember.">
            <MarkdownTextarea
              label="Notes"
              hideLabel
              name="notes"
              value={notes}
              onChange={setNotes}
              rows={10}
              maxLength={MAX_NOTES}
              placeholder={EXAMPLE}
              error={state.errors?.notes}
            />
          </FormSection>
        </div>

        <aside className="form-side" aria-label="What will be saved">
          <FormSection title="Subject" description="Shown in your results. It is the first line of your notes.">
            <p className={subject ? "form-read" : "form-read faint"}>{subject || "No subject yet"}</p>
          </FormSection>
          <FormSection title="Tracked links" description="Each link in your notes gets its own tracked version, so you can see who clicked.">
            {links.length === 0 ? (
              <p className="form-read faint">No links in your notes yet</p>
            ) : (
              <ol className="form-links">
                {links.map((l) => (
                  <li key={l}>
                    <span title={l}>{l.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                  </li>
                ))}
              </ol>
            )}
          </FormSection>
        </aside>
      </div>
    </FormModal>
  );
}
