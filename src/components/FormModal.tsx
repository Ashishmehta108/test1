"use client";

import { useEffect, useId, useRef, type FormEvent, type ReactNode } from "react";
import { SubmitButton } from "./SubmitButton";

/**
 * The shell for a create or edit form: a title, a body that scrolls on its own, and
 * Cancel + the one main button pinned at the bottom so they are always in view.
 * It owns the <form>, so don't put another form or more action buttons inside.
 */
export function FormModal({
  open,
  onClose,
  title,
  description,
  action,
  onSubmit,
  submitLabel,
  pendingText,
  error,
  note,
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  action: (form: FormData) => void;
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  pendingText: string;
  error?: string;
  /** One quiet line in the footer, after "* Required". */
  note?: string;
  size?: "md" | "full";
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`modal modal-${size}`}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // a click on the dimmed area around the form
      }}
    >
      <form noValidate action={action} onSubmit={onSubmit} className="modal-form">
        <header className="modal-head">
          <div className="modal-titles">
            <h2 id={titleId}>{title}</h2>
            {description && <p className="modal-desc">{description}</p>}
          </div>
          <button type="button" className="btn btn-quiet modal-x" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <div className="modal-body">{children}</div>
        <footer className="modal-foot">
          {error ? (
            <p className="modal-error" role="alert">{error}</p>
          ) : (
            <p className="modal-note"><span className="req" aria-hidden="true">*</span> Required{note ? <span className="modal-note-more">. {note}</span> : null}</p>
          )}
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <SubmitButton className="btn btn-primary" pendingText={pendingText}>
            {submitLabel}
          </SubmitButton>
        </footer>
      </form>
    </dialog>
  );
}

/** A group of fields about one decision, with a short title and one line saying why. */
export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="form-section">
      <header>
        <h3>{title}</h3>
        {description && <p className="small muted">{description}</p>}
      </header>
      {children}
    </section>
  );
}

/** Two or three short, related fields side by side (one per line on a phone). */
export function FormRow({ columns = 2, children }: { columns?: 2 | 3; children: ReactNode }) {
  return <div className={`form-row form-row-${columns}`}>{children}</div>;
}
