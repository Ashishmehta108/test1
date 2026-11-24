"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { updateMember, type EditMemberState } from "@/app/actions";
import { FormModal } from "@/components/FormModal";

type Props = { id: string; name: string; email: string; isMe: boolean; joined: boolean };

/** "Edit" on a person's line: change their name or the email they sign in with. */
export function EditMember(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-sm btn-quiet act-edit" aria-label={`Edit ${props.name}`} onClick={() => setOpen(true)}>
        Edit
      </button>
      {/* Mounted only while open, so every opening starts clean. Placed on the page itself,
          not inside the row, so the row's button styles don't reach the form. */}
      {open && createPortal(<EditDialog {...props} onDone={() => setOpen(false)} />, document.body)}
    </>
  );
}

function EditDialog({ id, name, email, isMe, joined, onDone }: Props & { onDone: () => void }) {
  const [state, action] = useActionState<EditMemberState, FormData>(updateMember.bind(null, id), {});

  useEffect(() => {
    if (state.saved) onDone();
  }, [state.saved, onDone]);

  const description = isMe
    ? "Check your email carefully: it's what you'll sign in with from now on."
    : joined
      ? "They'll sign in with the new email from now on. Their password stays the same."
      : "Their invite link keeps working.";

  return (
    <FormModal
      open
      onClose={onDone}
      title={isMe ? "Edit your details" : `Edit ${name}`}
      description={description}
      action={action}
      submitLabel="Save changes"
      pendingText="Saving…"
      error={state.error}
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
            defaultValue={state.values?.name ?? name}
            aria-invalid={state.field === "name" || undefined}
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
            defaultValue={state.values?.email ?? email}
            aria-invalid={state.field === "email" || undefined}
          />
        </div>
      </div>
    </FormModal>
  );
}
