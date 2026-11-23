import type { ReactNode } from "react";

/*
 * The small drawn pictures the app's frame uses: one for each page in the menu, and a few for pop-ups.
 * One family: a 24 x 24 grid, stroke 1.75, round caps and joins, drawn in currentColor.
 */

/** The drawing, on a 24 grid. */
function Draw({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" focusable="false" aria-hidden="true">
      {children}
    </svg>
  );
}

/** Results: an opened envelope with the letter showing. */
export function ResultsIcon() {
  return (
    <Draw>
      <path d="M3.5 10.2 12 4l8.5 6.2V18a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 18Z" />
      <path d="M3.8 10.8 12 16l8.2-5.2" />
      <path d="M8.8 9h6.4" />
    </Draw>
  );
}

/** Insights: a line climbing, with its arrow. */
export function InsightsIcon() {
  return (
    <Draw>
      <path d="M3.5 18.5 9.5 12.5l4 4 7-8" />
      <path d="M15.5 8.5h5v5" />
    </Draw>
  );
}

/** Leaderboard: a podium, three steps with the tallest in the middle, and a star over it. */
export function LeaderboardIcon() {
  return (
    <Draw>
      <path d="M3.5 20.5v-6.2a1 1 0 0 1 1-1H9v7.2" />
      <path d="M9 20.5V10.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v10" />
      <path d="M15 20.5v-7.2h4.5a1 1 0 0 1 1 1v6.2" />
      <path d="M2.5 20.5h19" />
      <path d="m12 3.2.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 5.3l2-.3Z" />
    </Draw>
  );
}

/** Profile: a head and shoulders. */
export function ProfileIcon() {
  return (
    <Draw>
      <circle cx="12" cy="8.2" r="3.6" />
      <path d="M4.8 20c0-3.9 3.2-6.4 7.2-6.4s7.2 2.5 7.2 6.4" />
    </Draw>
  );
}

/** Team: two people, one a little behind the other. */
export function TeamIcon() {
  return (
    <Draw>
      <circle cx="9" cy="8.6" r="3.1" />
      <path d="M3.2 19.5c0-3.3 2.6-5.4 5.8-5.4s5.8 2.1 5.8 5.4" />
      <circle cx="17" cy="9.6" r="2.5" />
      <path d="M16.6 14.1c2.6-.2 4.7 1.5 4.7 4.6" />
    </Draw>
  );
}

/** Account: a cog. */
export function AccountIcon() {
  return (
    <Draw>
      <path d="M10.34 5.1 10.75 2.68h2.5l.41 2.42A7.1 7.1 0 0 1 15.71 5.95L17.7 4.53l1.77 1.77-1.42 1.99A7.1 7.1 0 0 1 18.9 10.34l2.42.41v2.5l-2.42.41a7.1 7.1 0 0 1-.85 2.05l1.42 1.99-1.77 1.77-1.99-1.42a7.1 7.1 0 0 1-2.05.85l-.41 2.42h-2.5l-.41-2.42a7.1 7.1 0 0 1-2.05-.85L6.3 19.47 4.53 17.7l1.42-1.99a7.1 7.1 0 0 1-.85-2.05l-2.42-.41v-2.5l2.42-.41a7.1 7.1 0 0 1 .85-2.05L4.53 6.3 6.3 4.53l1.99 1.42a7.1 7.1 0 0 1 2.05-.85Z" />
      <circle cx="12" cy="12" r="2.7" />
    </Draw>
  );
}

/** Track an email: a paper plane. */
export function PlaneIcon() {
  return (
    <Draw>
      <path d="M20.5 3.5 3.5 10.2l6.3 2.6 2.6 6.3Z" />
      <path d="M9.8 12.8 20.5 3.5" />
    </Draw>
  );
}
