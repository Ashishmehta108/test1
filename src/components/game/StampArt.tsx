import type { CSSProperties, ReactNode } from "react";

/*
 * The drawn part of a stamp: one outline shared by every stamp, and one small line drawing for each stamp id.
 *
 * The outline is a scalloped edge, like the perforation of a postage stamp, with a thin round ring just inside it.
 * The ring does two jobs: it is the postmark ring on a stamp you have earned, and it is the track that the
 * progress arc runs along on a stamp you are working on.
 *
 * Everything is drawn on a 48 x 48 board. The drawings are on a 24 x 24 grid (stroke 1.75, round caps and joins,
 * currentColor), placed in the middle of the board. Colours come from the stylesheet (game-stamps.css), not from here:
 * each stamp has its own hue, named here and turned into colours there (the class st-h-<hue>).
 */

export type StampState = "earned" | "near" | "none";

// ---------- Each stamp's own colour ----------

/** The twelve bright hues of the game palette, as named in globals.css (--g-<hue>). */
export type StampHue = "coral" | "orange" | "sun" | "lime" | "green" | "teal" | "sky" | "blue" | "indigo" | "violet" | "magenta" | "rose";

/**
 * One hue for each stamp. Neighbours in the list are always far apart on the colour wheel, so a row of earned stamps
 * reads as a varied set. (Rose is left out on purpose: it sits too close to coral to tell apart at a glance.)
 */
export const STAMP_HUE: Record<string, StampHue> = {
  "first-email": "sky",
  "opened-10": "green",
  "first-click": "violet",
  "quick-open": "sun",
  "read-again": "magenta",
  "streak-5": "orange",
  "links-25": "indigo",
  "opened-50": "teal",
  "open-rate-70": "lime",
  "streak-10": "coral",
  "opened-100": "blue",
};

/** A stamp's hue. A stamp with no hue of its own (a written mark such as a level) is blue. */
export function stampHue(id: string | undefined): StampHue {
  return (id && Object.prototype.hasOwnProperty.call(STAMP_HUE, id) ? STAMP_HUE[id] : "blue") as StampHue;
}

const C = 24;

// ---------- The outline ----------

const SCALLOPS = 20;
const EDGE_R = 21.1;

const HALF = EDGE_R * Math.sin(Math.PI / SCALLOPS);
const BUMP_R = HALF * 1.75;

/** Where the bump between cusp i and cusp i + 1 sits: its circle's centre, and the angle it spans, from the stamp's middle. */
function bump(i: number) {
  const mid = -Math.PI / 2 + ((i + 1) / SCALLOPS) * Math.PI * 2;
  const m = EDGE_R * Math.cos(Math.PI / SCALLOPS);
  const off = m - Math.sqrt(BUMP_R * BUMP_R - HALF * HALF);
  return { cx: C + off * Math.cos(mid), cy: C + off * Math.sin(mid), from: mid - Math.asin(HALF / BUMP_R), to: mid + Math.asin(HALF / BUMP_R) };
}

const f = (n: number) => n.toFixed(3);

/** An arc along one bump, from `trim` of the way in to `trim` of the way before its end (0 for the whole bump). */
function bumpArc(i: number, trim: number): string {
  const b = bump(i);
  const span = b.to - b.from;
  const a0 = b.from + span * trim;
  const a1 = b.to - span * trim;
  return `M${f(b.cx + BUMP_R * Math.cos(a0))} ${f(b.cy + BUMP_R * Math.sin(a0))}A${f(BUMP_R)} ${f(BUMP_R)} 0 0 1 ${f(b.cx + BUMP_R * Math.cos(a1))} ${f(b.cy + BUMP_R * Math.sin(a1))}`;
}

/** The scalloped edge: twenty shallow bumps, one centred at the top, so the stamp is symmetrical. One closed outline. */
const EDGE = (() => {
  let d = "";
  for (let i = 0; i < SCALLOPS; i++) d += bumpArc(i, 0).replace(i === 0 ? "" : /^M[^A]*/, "");
  return d + "Z";
})();

/** The same edge as twenty separate bumps with a small gap at each point between two (the dashed look, drawn exactly). */
const EDGE_DASHED = Array.from({ length: SCALLOPS }, (_, i) => bumpArc(i, 0.17)).join("");

/** Radius of the ring inside the edge (the progress arc runs along it). */
export const RING_R = 17.4;

// ---------- The drawings ----------
// Each is drawn in a 24 x 24 box, centred on (12, 12). Numbers sit under a small drawing, set in the heading face.

/** A small count under a small drawing. */
function Count({ children, size = 11.5 }: { children: string; size?: number }) {
  return (
    <text className="st-count" x="12" y={21.5} fontSize={size} textAnchor="middle">
      {children}
    </text>
  );
}

/** A small closed envelope, about 15 x 8, in the top half of the box. */
function EnvelopeSmall() {
  return (
    <>
      <rect x="4.5" y="3" width="15" height="7.8" rx="1.8" />
      <path d="M5.3 4.2L12 8.1l6.7-3.9" />
    </>
  );
}

const DRAWINGS: Record<string, () => ReactNode> = {
  // Send your first tracked email: a folded paper plane.
  "first-email": () => (
    <>
      <path d="M3.4 10.6L20.6 3.4 15.1 20.6l-3.7-7.4z" />
      <path d="M20.6 3.4L11.4 13.2" />
    </>
  ),

  // 10 opened.
  "opened-10": () => (
    <>
      <EnvelopeSmall />
      <Count>10</Count>
    </>
  ),

  // Someone clicked a link: a pointer arrow with three small click marks.
  "first-click": () => (
    <g transform="translate(0.7 0.9)">
      <path d="M9 7.6V18.5l2.6-2.4 2 4.6 2.3-1-2-4.5h3.7z" />
      <path d="M4.2 7.6h2.2M9 2.8v2.2M5.6 4.2l1.5 1.5" />
    </g>
  ),

  // Opened within five minutes: a stopwatch.
  "quick-open": () => (
    <>
      <circle cx="12" cy="13.7" r="7.1" />
      <path d="M9.6 3.1h4.8M12 3.1v3.5M17.5 8.2l1.5-1.5M12 13.7V9.8" />
    </>
  ),

  // One email opened five or more times: an eye over "5+".
  "read-again": () => (
    <>
      <path d="M3.6 7.4C5.8 4.4 8.7 3.2 12 3.2s6.2 1.2 8.4 4.2c-2.2 3-5.1 4.2-8.4 4.2S5.8 10.4 3.6 7.4z" />
      <circle cx="12" cy="7.4" r="1.6" fill="currentColor" stroke="none" />
      <Count>5+</Count>
    </>
  ),

  // Five working days in a row: a calendar page with a week of five dots.
  "streak-5": () => (
    <>
      <rect x="2.8" y="4.6" width="18.4" height="16.4" rx="2.6" />
      <path d="M2.8 9.6h18.4M8 2.8v3.6M16 2.8v3.6" />
      <path d="M5.6 15.2h.01M8.8 15.2h.01M12 15.2h.01M15.2 15.2h.01M18.4 15.2h.01" />
    </>
  ),

  // 25 link clicks: a link over "25".
  "links-25": () => (
    <>
      <g transform="translate(0 -0.7)">
        <path d="M10.4 3.6H8a3.7 3.7 0 0 0 0 7.4h2.4M13.6 3.6H16a3.7 3.7 0 0 1 0 7.4h-2.4M9.3 7.3h5.4" />
      </g>
      <Count>25</Count>
    </>
  ),

  // 50 opened.
  "opened-50": () => (
    <>
      <EnvelopeSmall />
      <Count>50</Count>
    </>
  ),

  // 70 percent or more opened: a half-circle gauge with its needle past the middle, over "70".
  "open-rate-70": () => (
    <>
      <g transform="translate(0 -0.9)">
        <path d="M4.6 11.4a7.4 7.4 0 0 1 14.8 0" />
        <path d="M12 11.4l3.1-4.2" />
      </g>
      <Count>70</Count>
    </>
  ),

  // Ten working days in a row: the same calendar page with two weeks of dots.
  "streak-10": () => (
    <>
      <rect x="2.8" y="4.6" width="18.4" height="16.4" rx="2.6" />
      <path d="M2.8 9.6h18.4M8 2.8v3.6M16 2.8v3.6" />
      <path d="M5.6 13.4h.01M8.8 13.4h.01M12 13.4h.01M15.2 13.4h.01M18.4 13.4h.01M5.6 17.2h.01M8.8 17.2h.01M12 17.2h.01M15.2 17.2h.01M18.4 17.2h.01" />
    </>
  ),

  // 100 opened.
  "opened-100": () => (
    <>
      <EnvelopeSmall />
      <Count size={10.5}>100</Count>
    </>
  ),
};

/** Whether a stamp id has a drawing. Any other id falls back to its written mark. */
export function hasDrawing(id: string | undefined): id is string {
  return !!id && Object.prototype.hasOwnProperty.call(DRAWINGS, id);
}

// ---------- The whole stamp ----------

/** The written mark, for stamps with no drawing: one or two characters read large, longer ones smaller. */
function MarkText({ mark }: { mark: string }) {
  const size = mark.length <= 2 ? 16 : mark.length === 3 ? 13 : 10.5;
  return (
    <text className="st-count st-mark" x={C} y={C + size * 0.35} fontSize={size} textAnchor="middle">
      {mark}
    </text>
  );
}

/**
 * One stamp as a single SVG. `state` is how it looks: earned (in its own bright hue, with a full ring), near (its hue at
 * part strength, with a progress arc when `progress` is above 0) or none (grey and dashed). `px` is the width and height in pixels.
 */
export function StampArt({
  id,
  mark,
  state,
  progress = 0,
  px,
  className = "",
}: {
  id?: string;
  mark: string;
  state: StampState;
  progress?: number;
  px: number;
  className?: string;
}) {
  const p = Math.min(1, Math.max(0, progress));
  const arc = Math.max(p * 100, 1.5);
  // The drawing is a little larger on the smallest stamp so its lines stay readable.
  const scale = px < 40 ? 1.18 : 1.1;
  const drawn = hasDrawing(id);

  return (
    <svg
      className={`st-seal st-${state} st-h-${stampHue(id)} ${className}`.trim()}
      style={state === "near" ? ({ "--p": p } as CSSProperties) : undefined}
      width={px}
      height={px}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path className="st-edge" d={state === "none" ? EDGE_DASHED : EDGE} />
      {state === "earned" && <circle className="st-ring" cx={C} cy={C} r={RING_R} pathLength={100} transform={`rotate(-90 ${C} ${C})`} />}
      {state === "near" && (
        <>
          <circle className="st-track" cx={C} cy={C} r={RING_R} />
          {p > 0 && <circle className="st-arc" cx={C} cy={C} r={RING_R} pathLength={100} strokeDasharray={`${arc} 100`} transform={`rotate(-90 ${C} ${C})`} />}
        </>
      )}
      {drawn ? (
        <g className="st-glyph" transform={`translate(${C} ${C}) scale(${scale}) translate(-12 -12)`}>
          {DRAWINGS[id!]()}
        </g>
      ) : (
        <MarkText mark={mark} />
      )}
    </svg>
  );
}
