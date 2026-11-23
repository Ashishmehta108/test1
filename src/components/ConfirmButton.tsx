"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { PendingLabel } from "./SubmitButton";

/** A submit button that asks once ("Click again to …") before it submits, then shows a pending label while saving. */
export function ConfirmButton({
  label,
  confirmLabel,
  pendingText = "Working…",
  className = "",
}: {
  label: string;
  confirmLabel: string;
  pendingText?: string;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();
  return (
    <button
      type={armed ? "submit" : "button"}
      className={className}
      disabled={pending}
      aria-busy={pending || undefined}
      data-armed={armed && !pending ? "" : undefined}
      onClick={(e) => {
        if (!armed) {
          e.preventDefault();
          setArmed(true);
          window.setTimeout(() => setArmed(false), 4000);
        }
      }}
    >
      <PendingLabel pending={pending} pendingText={pendingText}>
        {armed ? confirmLabel : label}
      </PendingLabel>
    </button>
  );
}
