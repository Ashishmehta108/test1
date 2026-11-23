"use client";

import { useState } from "react";

/** Folds the left menu down to a narrow strip, or opens it again. Remembered on this browser. */
export function SideToggle({ closed: startClosed = false }: { closed?: boolean }) {
  const [closed, setClosed] = useState(startClosed);
  const label = closed ? "Show menu" : "Hide menu";
  return (
    <button
      type="button"
      className="btn btn-quiet side-toggle"
      aria-label={label}
      aria-expanded={!closed}
      data-tip={label}
      onClick={() => {
        const shell = document.querySelector<HTMLElement>(".shell");
        if (!shell) return;
        const next = shell.dataset.side === "closed" ? "open" : "closed";
        shell.dataset.side = next;
        setClosed(next === "closed");
        document.cookie = `ot_side=${next}; path=/; max-age=31536000; samesite=lax`;
      }}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
        <path d="M9.5 4.5v15" />
      </svg>
    </button>
  );
}
