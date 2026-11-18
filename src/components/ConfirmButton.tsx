"use client";

import { useState } from "react";

/** A submit button that asks once ("Click again to …") before it submits. */
export function ConfirmButton({ label, confirmLabel, className = "" }: { label: string; confirmLabel: string; className?: string }) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      type={armed ? "submit" : "button"}
      className={className}
      onClick={(e) => {
        if (!armed) {
          e.preventDefault();
          setArmed(true);
          window.setTimeout(() => setArmed(false), 4000);
        }
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
