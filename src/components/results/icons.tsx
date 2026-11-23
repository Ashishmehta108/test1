import type { ReactNode } from "react";

/**
 * The small drawn icons used on Results and on one email's page.
 * One family: a 24 by 24 grid, one stroke weight, round ends and corners, colour from the text colour around them.
 */
export type IconName = "send" | "open" | "click" | "clock" | "flag" | "maybe" | "inbox" | "search" | "mail" | "check";

const DRAW: Record<IconName, ReactNode> = {
  /** A paper plane: an email on its way. */
  send: (
    <>
      <path d="M21 3.2 3.2 10.1l7.1 3.3 3.3 7.1z" />
      <path d="M10.3 13.4 21 3.2" />
    </>
  ),
  /** An envelope with its flap lifted: opened. */
  open: (
    <>
      <path d="M3.2 10.3 12 3.6l8.8 6.7V18a2 2 0 0 1-2 2H5.2a2 2 0 0 1-2-2z" />
      <path d="m3.6 10.8 8.4 5.6 8.4-5.6" />
    </>
  ),
  /** A pointer with two small taps: a click. */
  click: (
    <>
      <path d="M8.2 8.2 20 12.9l-5.1 1.8-1.9 5.3z" />
      <path d="M4.2 4.2 5.7 5.7M4.2 10.6 5.9 10.1M10.6 4.2 10.1 5.9" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.2V12l3.2 2" />
    </>
  ),
  flag: (
    <>
      <path d="M6 21V3.8" />
      <path d="M6 4.6h11.2l-2.3 3.9 2.3 3.9H6" />
    </>
  ),
  /** A question mark in a ring: maybe. */
  maybe: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M9.6 9.7a2.5 2.5 0 0 1 4.8.9c0 1.6-2.4 2-2.4 3.5" />
      <path d="M12 16.9h.01" />
    </>
  ),
  /** An empty tray: nothing here yet. */
  inbox: (
    <>
      <path d="m3.2 13.4 2.5-6.8A2 2 0 0 1 7.6 5.2h8.8a2 2 0 0 1 1.9 1.4l2.5 6.8" />
      <path d="M3.2 13.4V18a2 2 0 0 0 2 2h13.6a2 2 0 0 0 2-2v-4.6h-5.1a3.7 3.7 0 0 1-7.4 0z" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.6" />
      <path d="m20.4 20.4-4.9-4.9" />
    </>
  ),
  /** A closed envelope. */
  mail: (
    <>
      <rect x="3.2" y="5.2" width="17.6" height="13.6" rx="2.2" />
      <path d="m4 7 8 6.2L20 7" />
    </>
  ),
  check: <path d="m5.2 12.6 4.5 4.5 9.1-9.7" />,
};

/** A drawn icon. Decorative: it sits beside words that say the same thing. */
export function ResultIcon({ name, size, stroke = 1.75 }: { name: IconName; size?: number; stroke?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {DRAW[name]}
    </svg>
  );
}

