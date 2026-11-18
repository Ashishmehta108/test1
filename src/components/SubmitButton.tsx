"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import "../app/polish.css";

/**
 * Shows the label on the button, or a spinner plus `pendingText` while its form is saving.
 * The button keeps the width of the longer label, so nothing jumps.
 */
export function PendingLabel({ pending, pendingText, children }: { pending: boolean; pendingText: string; children: ReactNode }) {
  return (
    <span className="sbtn-stack">
      <span className={pending ? "sbtn-hidden" : undefined}>{children}</span>
      <span className={pending ? undefined : "sbtn-hidden"}>
        <span className="spin" aria-hidden="true" />
        {pendingText}
      </span>
    </span>
  );
}

type Props = Omit<ComponentPropsWithoutRef<"button">, "children" | "type"> & {
  children: ReactNode;
  pendingText: string;
  className?: string;
};

/** A submit button for a form. Use it inside the form whose action it should run. */
export function SubmitButton({ children, pendingText, className = "", disabled, ...rest }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      {...rest}
      type="submit"
      className={className}
      disabled={pending || disabled}
      aria-busy={pending || undefined}
    >
      <PendingLabel pending={pending} pendingText={pendingText}>
        {children}
      </PendingLabel>
    </button>
  );
}
