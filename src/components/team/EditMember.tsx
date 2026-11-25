"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { updateMember, type EditMemberState } from "@/app/actions";
import { FormModal } from "@/components/FormModal";

type Shown = { name: string; email: string };
type Props = {
  id: string;
  name: string;
  email: string;
  isMe: boolean;
  joined: boolean;
  /** Tells the row the new name and email right away, before the server has answered. */
  onSaving: (values: Shown) => void;
};

/** "Edit" on a person's line: change their name or the email they sign in with. */
export function EditMember(props: Props) {
  // null means closed. Otherwise it holds what the dialog should show (and any error from a save that failed).
  const [dialog, setDialog] = useState<EditMemberState | null>(null);

  async function save(form: FormData) {
    const name = String(form.get("name") ?? "").trim().slice(0, 80);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const values = { name, email };
    // Only show the change early when it looks right. Otherwise the server's own message comes back first.
    const looksRight = name !== "" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (looksRight) props.onSaving(values);
    setDialog(null);
    try {
      const result = await updateMember(props.id, {}, form);
      // A problem: bring the dialog back with what was typed and the message, so nothing is lost.
      if (result.error) setDialog({ error: result.error, field: result.field, values: result.values ?? values });
    } catch {
      setDialog({ error: "Couldn't save just now. Please try again.", values });
    }
  }

  return (
    <>
      <button type="button" className="btn btn-sm btn-quiet act-edit" aria-label={`Edit ${props.name}`} onClick={() => setDialog({})}>
        Edit
      </button>
      {/* Mounted only while open, so every opening starts clean. Placed on the page itself,
          not inside the row, so the row's button styles don't reach the form. */}
      {dialog &&
        createPortal(<EditDialog {...props} shown={dialog} onClose={() => setDialog(null)} onSave={save} />, document.body)}
    </>
  );
}

function EditDialog({
  id,
  name,
  email,
  isMe,
  joined,
  shown,
  onClose,
  onSave,
}: Omit<Props, "onSaving"> & { shown: EditMemberState; onClose: () => void; onSave: (form: FormData) => Promise<void> }) {
  const description = isMe
    ? "Check your email carefully: it's what you'll sign in with from now on."
    : joined
      ? "They'll sign in with the new email from now on. Their password stays the same."
      : "Their invite link keeps working.";

  return (
    <FormModal
      open
      onClose={onClose}
      title={isMe ? "Edit your details" : `Edit ${name}`}
      description={description}
      action={onSave}
      submitLabel="Save changes"
      pendingText="Saving…"
      error={shown.error}
    >
      <div className="form">
        <div className="field">
          <label htmlFor={`edit-name-${id}`}>
            Name <span className="req" aria-hidden="true">*</span>
          </label>
          <input
            id={`edit-name-${id}`}
            name="name"
            className="input"
            required
            maxLength={80}
            defaultValue={shown.values?.name ?? name}
            aria-invalid={shown.field === "name" || undefined}
          />
        </div>
        <div className="field">
          <label htmlFor={`edit-email-${id}`}>
            Email {isMe ? "you sign" : "they sign"} in with <span className="req" aria-hidden="true">*</span>
          </label>
          <input
            id={`edit-email-${id}`}
            name="email"
            type="email"
            className="input"
            required
            defaultValue={shown.values?.email ?? email}
            aria-invalid={shown.field === "email" || undefined}
          />
        </div>
      </div>
    </FormModal>
  );
}
