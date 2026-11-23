import type { CSSProperties, ReactNode } from "react";

/*
 * One prize for every level, twenty in all.
 *
 * Each is a small flat emblem with its own outline and its own drawn object inside: a round medal with a sprout, a scalloped
 * rosette with a bow, a hexagon with a bell, and so on. It is drawn on a 48 x 48 board; the objects are drawn on a 24 x 24 grid
 * (round caps and joins) and set in the middle of the medal.
 *
 * The set grows grander as you climb. Levels 1 to 12 are plain medals. Levels 13 to 16 sit above a ribbon (the number is on it).
 * Levels 17 to 20 are wreathed in a laurel with a star or a crown on top. Past Level 20 the twenty start again, each ringed
 * with a row of beads (more rings the more times round).
 *
 * Won prizes wear their colour: a band of the hue, a soft wash for the face, the object in ink with a touch of the hue.
 * The next prize is the same emblem as a dashed outline in its hue (so you can see what you are heading for).
 * Later ones are the same, dashed in grey. The colours come from the stylesheet (game-level.css) through three custom
 * properties set on the element (see hueStyle).
 */

export type PrizeHue = "coral" | "orange" | "sun" | "lime" | "green" | "teal" | "sky" | "blue" | "indigo" | "violet" | "magenta" | "rose";
export type PrizeState = "reached" | "passed" | "next" | "later";
export type PrizeSize = "sm" | "md" | "lg" | "xl";
export type Prize = { level: number; name: string; hue: PrizeHue };

/** The twenty prizes, one per level. Colours are spread round the wheel so neighbours never look alike. */
export const PRIZES: readonly Prize[] = [
  { level: 1, name: "Sprout", hue: "green" },
  { level: 2, name: "Ribbon", hue: "rose" },
  { level: 3, name: "Bell", hue: "sun" },
  { level: 4, name: "Compass", hue: "sky" },
  { level: 5, name: "Lantern", hue: "coral" },
  { level: 6, name: "Kite", hue: "violet" },
  { level: 7, name: "Anchor", hue: "teal" },
  { level: 8, name: "Key", hue: "indigo" },
  { level: 9, name: "Trophy", hue: "orange" },
  { level: 10, name: "Star", hue: "lime" },
  { level: 11, name: "Crown", hue: "magenta" },
  { level: 12, name: "Comet", hue: "blue" },
  { level: 13, name: "Feather", hue: "rose" },
  { level: 14, name: "Rocket", hue: "orange" },
  { level: 15, name: "Lighthouse", hue: "sky" },
  { level: 16, name: "Mountain", hue: "lime" },
  { level: 17, name: "Planet", hue: "teal" },
  { level: 18, name: "Moon", hue: "indigo" },
  { level: 19, name: "Gem", hue: "magenta" },
  { level: 20, name: "Sun", hue: "sun" },
];

export type PrizeLook = Prize & {
  /** Which of the twenty drawings this level wears (0 to 19). */
  art: number;
  /** How many times round the set: 0 for Levels 1 to 20, 1 for 21 to 40 (a ring of beads), 2 adds a line, and so on. */
  lap: number;
  /** The name with its "+N" when it is a repeat: "Sprout" or "Sprout +1". */
  title: string;
  /** The name in words for screen readers: "Sprout" or "Sprout, with a ring of beads". */
  words: string;
};

/** The prize for any level. Past the last one the twenty start again, each ringed with beads. */
export function prizeFor(level: number): PrizeLook {
  const n = Math.max(1, Math.floor(level) || 1);
  const art = (n - 1) % PRIZES.length;
  const lap = Math.floor((n - 1) / PRIZES.length);
  const base = PRIZES[art];
  const trim = lap === 0 ? "" : lap === 1 ? "with a ring of beads" : lap === 2 ? "with a ring of beads and a line" : "with a ring of beads and two lines";
  return { level: n, name: base.name, hue: base.hue, art, lap, title: lap ? `${base.name} +${lap}` : base.name, words: trim ? `${base.name}, ${trim}` : base.name };
}

/** The colour properties a prize (or anything coloured by a prize, such as a bar) reads. */
export function hueStyle(hue: PrizeHue): CSSProperties {
  return { "--lv-hue": `var(--g-${hue})`, "--lv-wash": `var(--g-${hue}-wash)`, "--lv-ink": `var(--g-${hue}-ink)` } as CSSProperties;
}

const SAY: Record<PrizeState, string> = { reached: "your level", passed: "won", next: "the next level", later: "not yet won" };

// ---------- Geometry ----------

type Pt = [number, number];
const num = (n: number) => String(Math.round(n * 100) / 100);
const pt = (p: Pt) => `${num(p[0])} ${num(p[1])}`;
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const toward = (from: Pt, to: Pt, by: number): Pt => {
  const d = dist(from, to) || 1;
  return [from[0] + ((to[0] - from[0]) * by) / d, from[1] + ((to[1] - from[1]) * by) / d];
};
const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
/** Scale about a point (the way a face is shrunk inside its outline). */
const scaleAbout = (cx: number, cy: number, kx: number, ky = kx) => `translate(${cx} ${cy}) scale(${kx} ${ky}) translate(${-cx} ${-cy})`;
const circle = (cx: number, cy: number, r: number) => `M${cx} ${cy - r}a${r} ${r} 0 1 1 0 ${2 * r}a${r} ${r} 0 1 1 0 ${-2 * r}Z`;

/** A closed shape through the points with rounded corners. It starts at the tip of the first corner (so dashes centre on it). */
function roundPoly(pts: Pt[], r: number | number[]): string {
  const n = pts.length;
  const at = (i: number) => (Array.isArray(r) ? r[i] : r);
  const cs = pts.map((p, i) => {
    const before = pts[(i + n - 1) % n];
    const after = pts[(i + 1) % n];
    return { a: toward(p, before, Math.min(at(i), dist(p, before) / 2)), p, b: toward(p, after, Math.min(at(i), dist(p, after) / 2)) };
  });
  const c0 = cs[0];
  const tip: Pt = [(c0.a[0] + 2 * c0.p[0] + c0.b[0]) / 4, (c0.a[1] + 2 * c0.p[1] + c0.b[1]) / 4];
  let d = `M${pt(tip)}Q${pt(mid(c0.p, c0.b))} ${pt(c0.b)}`;
  for (let i = 1; i < n; i++) d += `L${pt(cs[i].a)}Q${pt(cs[i].p)} ${pt(cs[i].b)}`;
  return d + `L${pt(c0.a)}Q${pt(mid(c0.a, c0.p))} ${pt(tip)}Z`;
}

/** Points evenly round a centre, alternating between two radii (a star or a burst). `turn` rotates it, in degrees. */
function burst(cx: number, cy: number, count: number, outer: number, inner: number, turn = 0): Pt[] {
  return Array.from({ length: count * 2 }, (_, i) => {
    const a = -Math.PI / 2 + (turn * Math.PI) / 180 + (i * Math.PI) / count;
    const r = i % 2 === 0 ? outer : inner;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as Pt;
  });
}

/** A regular shape with `n` corners round a centre. */
function regular(cx: number, cy: number, n: number, r: number, turn = 0): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (turn * Math.PI) / 180 + (i * 2 * Math.PI) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as Pt;
  });
}

/** Scalloped edge: `n` round bumps, one centred at the top. Starts at a point between two bumps. */
function scallops(n: number, rc: number, swell: number): string {
  const chord = 2 * rc * Math.sin(Math.PI / n);
  const rb = chord * swell;
  const cusp = (i: number): Pt => {
    const a = -Math.PI / 2 + ((i - 0.5) * 2 * Math.PI) / n;
    return [24 + rc * Math.cos(a), 24 + rc * Math.sin(a)];
  };
  let d = `M${pt(cusp(0))}`;
  for (let i = 1; i <= n; i++) d += `A${num(rb)} ${num(rb)} 0 0 1 ${pt(cusp(i % n))}`;
  return d + "Z";
}

/** A ship's wheel: a ring with eight rounded handles. Starts at the tip of the top handle. */
function wheel(): string {
  const ring = 17.4;
  const w = 2.45;
  const tipR = 19.7;
  const phi = Math.asin(w / ring);
  const th = (k: number) => -Math.PI / 2 + (k * Math.PI) / 4;
  const at = (theta: number, radius: number, side: number, across: number): Pt => {
    const ux = Math.cos(theta);
    const uy = Math.sin(theta);
    return [24 + radius * ux - side * across * uy, 24 + radius * uy + side * across * ux];
  };
  const base = (k: number, side: number): Pt => [24 + ring * Math.cos(th(k) + side * phi), 24 + ring * Math.sin(th(k) + side * phi)];
  let d = `M24 ${num(24 - tipR - w)}A${w} ${w} 0 0 1 ${pt(at(th(0), tipR, 1, w))}L${pt(base(0, 1))}`;
  for (let k = 1; k <= 8; k++) {
    const kk = k % 8;
    d += `A${ring} ${ring} 0 0 1 ${pt(base(kk, -1))}`;
    if (k === 8) break;
    d += `L${pt(at(th(kk), tipR, -1, w))}A${w} ${w} 0 0 1 ${pt(at(th(kk), tipR, 1, w))}L${pt(base(kk, 1))}`;
  }
  d += `L${pt(at(th(0), tipR, -1, w))}A${w} ${w} 0 0 1 24 ${num(24 - tipR - w)}Z`;
  return d;
}

type Frame = "ribbon" | "star" | "crown";

type Shape = {
  /** The outside edge. */
  outline: string;
  /** The face path (the outline itself when omitted), shrunk by `k` about `c`. */
  face?: string;
  k: [number, number];
  c?: Pt;
  /** Where the middle of the drawing sits, and where it sits when a numeral goes beneath it (xl). */
  at: Pt;
  atNum: Pt;
  /** How big the drawing is at xl (a share of its 24-unit grid). */
  xs?: number;
  /** The numeral's centre x and baseline y (xl). */
  num: Pt;
  /** Dashes round the outline at sm, md, lg, xl, and where the first dash sits as a share of one dash-and-gap. */
  dash: [number, number, number, number];
  phase: number;
  /** What is added round it from Level 13: a ribbon beneath, or a laurel with a star or a crown on top. */
  frame?: Frame;
};

const HEX = roundPoly(regular(24, 24, 6, 23.4), 4.4);
const DIAMOND = roundPoly([[24, 0.8], [47.2, 24], [24, 47.2], [0.8, 24]], 5);
const PENNANT = roundPoly([[24, 2], [41, 2], [41, 46], [24, 38], [7, 46], [7, 2]], [0, 3, 3, 1.5, 3, 3]);
const SUNBURST = roundPoly(burst(24, 24, 12, 23, 18.6), Array.from({ length: 24 }, (_, i) => (i % 2 === 0 ? 1.1 : 0.5)));
const OCTAGON = roundPoly(regular(24, 24, 8, 24.6, 22.5), 3.8);
const GABLE = roundPoly(regular(24, 26.4, 5, 24.4), 4.2);
/** Four round lobes (a clover) meeting in four points. */
const CLOVER = "M24 7.75A11.5 11.5 0 1 1 40.25 24A11.5 11.5 0 1 1 24 40.25A11.5 11.5 0 1 1 7.75 24A11.5 11.5 0 1 1 24 7.75Z";
const LANDSCAPE = "M24 7.5a22.6 16.5 0 1 1 0 33a22.6 16.5 0 1 1 0-33Z";
const SHIELD = "M24 2.5Q33 7.2 39.8 7.2a2.2 2.2 0 0 1 2.2 2.2V23C42 34 34 41 24 46C14 41 6 34 6 23V9.4a2.2 2.2 0 0 1 2.2-2.2Q15 7.2 24 2.5Z";

const SHAPES: Shape[] = [
  // 1 Sprout: round medal
  { outline: circle(24, 24, 22), k: [0.845, 0.845], at: [24, 24], atNum: [24, 20.8], num: [24, 37.4], dash: [12, 16, 24, 32], phase: 0 },
  // 2 Ribbon: scalloped rosette
  { outline: scallops(12, 19.4, 0.585), face: circle(24, 24, 22), k: [0.74, 0.74], at: [24, 24], atNum: [24, 21], num: [24, 36], dash: [12, 12, 12, 24], phase: 0.5 },
  // 3 Bell: hexagon
  { outline: HEX, k: [0.835, 0.835], at: [24, 24], atNum: [24, 20.2], num: [24, 37.4], dash: [12, 12, 18, 24], phase: 0 },
  // 4 Compass: diamond
  { outline: DIAMOND, k: [0.8, 0.8], at: [24, 24], atNum: [24, 20.6], num: [24, 35.8], xs: 0.74, dash: [8, 12, 16, 24], phase: 0 },
  // 5 Lantern: arched window
  { outline: "M24 2A19 19 0 0 1 43 21V42a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V21A19 19 0 0 1 24 2Z", k: [0.84, 0.84], at: [24, 25], atNum: [24, 21.4], num: [24, 38.4], xs: 0.78, dash: [12, 14, 20, 28], phase: 0 },
  // 6 Kite: banner with a swallowtail
  { outline: PENNANT, k: [0.82, 0.82], at: [24, 22], atNum: [24, 16.8], num: [24, 32.2], xs: 0.78, dash: [12, 14, 20, 26], phase: 0 },
  // 7 Anchor: ship's wheel
  { outline: wheel(), face: circle(24, 24, 22), k: [0.64, 0.64], at: [24, 24], atNum: [24, 19.8], num: [24, 34.4], xs: 0.54, dash: [8, 8, 16, 16], phase: 0 },
  // 8 Key: oval cameo
  { outline: "M24 2a17.6 22 0 1 1 0 44a17.6 22 0 1 1 0-44Z", k: [0.83, 0.865], at: [24, 24], atNum: [24, 20.6], num: [24, 37.6], dash: [12, 16, 22, 30], phase: 0 },
  // 9 Trophy: rounded plaque
  { outline: "M24 4h9a11 11 0 0 1 11 11v18a11 11 0 0 1-11 11H15a11 11 0 0 1-11-11V15A11 11 0 0 1 15 4Z", k: [0.82, 0.82], at: [24, 24], atNum: [24, 20.8], num: [24, 36.8], dash: [8, 12, 16, 24], phase: 0 },
  // 10 Star: starburst seal
  { outline: SUNBURST, face: circle(24, 24, 22), k: [0.69, 0.69], at: [24, 24], atNum: [24, 20.8], num: [24, 35.8], xs: 0.78, dash: [12, 12, 12, 12], phase: 0 },
  // 11 Crown: crest
  { outline: SHIELD, k: [0.82, 0.82], c: [24, 24], at: [24, 22.6], atNum: [24, 19.6], num: [24, 35], xs: 0.78, dash: [12, 14, 20, 28], phase: 0 },
  // 12 Comet: teardrop pointing up and to the right
  { outline: "M40.58 3.87Q45 3 44.13 7.42L39.66 30.09A18.5 18.5 0 1 1 17.91 8.34Z", k: [0.83, 0.83], c: [21.5, 26.5], at: [22, 26], atNum: [21.6, 22.6], num: [21.6, 38.2], xs: 0.8, dash: [12, 14, 20, 28], phase: 0 },
  // 13 Feather: octagon on a ribbon
  { outline: OCTAGON, k: [0.84, 0.84], at: [24, 24], atNum: [24, 24], num: [24, 24], dash: [8, 8, 16, 24], phase: 0, frame: "ribbon" },
  // 14 Rocket: gable on a ribbon
  { outline: GABLE, k: [0.8, 0.8], c: [24, 26.4], at: [24, 27], atNum: [24, 27], num: [24, 24], dash: [10, 10, 15, 20], phase: 0, frame: "ribbon" },
  // 15 Lighthouse: clover on a ribbon
  { outline: CLOVER, k: [0.8, 0.8], at: [24, 24], atNum: [24, 24], num: [24, 24], dash: [8, 8, 16, 16], phase: 0, frame: "ribbon" },
  // 16 Mountain: landscape oval on a ribbon
  { outline: LANDSCAPE, k: [0.84, 0.8], at: [24, 24], atNum: [24, 24], num: [24, 24], dash: [12, 16, 22, 30], phase: 0, frame: "ribbon" },
  // 17 Planet: round coin with a laurel and a star
  { outline: circle(24, 24, 22), k: [0.845, 0.845], at: [24, 24], atNum: [24, 20.4], num: [24, 36.6], dash: [12, 16, 24, 32], phase: 0, frame: "star" },
  // 18 Moon: crest with a laurel and a star
  { outline: SHIELD, k: [0.82, 0.82], c: [24, 24], at: [24, 22.6], atNum: [24, 19.4], num: [24, 34.6], xs: 0.78, dash: [12, 14, 20, 28], phase: 0, frame: "star" },
  // 19 Gem: hexagon with a laurel and a crown
  { outline: HEX, k: [0.835, 0.835], at: [24, 24], atNum: [24, 20.6], num: [24, 36.6], dash: [12, 12, 18, 24], phase: 0, frame: "crown" },
  // 20 Sun: soft rosette with a laurel and a crown
  { outline: scallops(16, 19.6, 0.6), face: circle(24, 24, 22), k: [0.75, 0.75], at: [24, 24], atNum: [24, 20.8], num: [24, 36.2], dash: [16, 16, 16, 32], phase: 0.5, frame: "crown" },
];

// ---------- The twenty drawings (24 x 24 grid) ----------
// Four kinds of line: gl is a line in ink, gf a shape filled with the prize colour and outlined in ink, gk a solid ink dot,
// gw a shape filled with the face colour (a hole, a window, a cap of snow).

const STAR = roundPoly(burst(12, 12.9, 5, 10.4, 4.5), 1);
const RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  const [x1, y1] = [12 + 7.4 * Math.cos(a), 12 + 7.4 * Math.sin(a)];
  const [x2, y2] = [12 + 10.4 * Math.cos(a), 12 + 10.4 * Math.sin(a)];
  return `M${num(x1)} ${num(y1)}L${num(x2)} ${num(y2)}`;
}).join("");

const GLYPHS: ReactNode[] = [
  // 1 Sprout
  <>
    <path className="lv-gl" d="M4.5 20.5h15M12 20.5v-10" />
    <path className="lv-gf" d="M12 15.5c0-4-2.5-6.5-7-6.5 0 4 2.5 6.5 7 6.5Z" />
    <path className="lv-gf" d="M12 11.5c0-4.5 2.5-7 7-7 0 4.5-2.5 7-7 7Z" />
  </>,
  // 2 Ribbon (a bow)
  <>
    <path className="lv-gl" d="M11 14.2 8.6 20.6M13 14.2l2.4 6.4" />
    <path className="lv-gf" d="M12 12.5C10 8.5 6.2 6.8 4.6 8.4 3 10 5 14 12 12.5Z" />
    <path className="lv-gf" d="M12 12.5c2-4 5.8-5.7 7.4-4.1 1.6 1.6-.4 5.6-7.4 4.1Z" />
    <circle className="lv-gf" cx="12" cy="12.5" r="2" />
  </>,
  // 3 Bell
  <>
    <path className="lv-gl" d="M12 3.4v2.4" />
    <path className="lv-gf" d="M6.6 17.2v-5.7a5.4 5.4 0 0 1 10.8 0v5.7l1.7 1.8H4.9Z" />
    <circle className="lv-gf" cx="12" cy="21" r="1.5" />
  </>,
  // 4 Compass
  <>
    <circle className="lv-gl" cx="12" cy="12" r="9.3" />
    <path className="lv-gl" d="M12 2.7v2M12 21.3v-2M2.7 12h2M21.3 12h-2" />
    <g transform="rotate(45 12 12)">
      <path className="lv-gf" d="M12 6.2 14.3 12H9.7Z" />
      <path className="lv-gl" d="M12 17.8 9.7 12h4.6Z" />
    </g>
    <circle className="lv-gk" cx="12" cy="12" r="1" />
  </>,
  // 5 Lantern
  <>
    <path className="lv-gl" d="M12 2.8v2.2M12 20.6v2.2" />
    <path className="lv-gf" d="M12 7c4 0 6.6 2.7 6.6 5.8S16 18.6 12 18.6s-6.6-2.7-6.6-5.8S8 7 12 7Z" />
    <path className="lv-gl" d="M12 7c-2.4 2-2.4 9.6 0 11.6M12 7c2.4 2 2.4 9.6 0 11.6" />
    <path className="lv-gk" d="M9 5h6v2H9ZM9 18.6h6v2H9Z" />
  </>,
  // 6 Kite
  <>
    <path className="lv-gf" d="M12 2.5 18.2 9.3 12 17 5.8 9.3Z" />
    <path className="lv-gl" d="M12 2.5V17M5.8 9.3h12.4" />
    <path className="lv-gl" d="M12 17c-2.2 1.2 2.2 2.4 0 3.6" />
    <path className="lv-gk" d="M9.9 21.9 12 20.6l2.1 1.3Z" />
  </>,
  // 7 Anchor
  <>
    <path className="lv-gl" d="M12 7.6v13.4M8.4 11.2h7.2" />
    <path className="lv-gl" d="M4.6 13.6c.4 4 3.3 7.4 7.4 7.4s7-3.4 7.4-7.4" />
    <path className="lv-gl" d="M2.7 15.3l1.9-2.1 2.4 2M21.3 15.3l-1.9-2.1-2.4 2" />
    <circle className="lv-gf" cx="12" cy="5.3" r="2.4" />
  </>,
  // 8 Key
  <g transform="translate(.5 .5) translate(12 12) scale(1.08) rotate(45) translate(-12 -12)">
    <path className="lv-gl" d="M10.1 12h11.4M17.2 12v3.2M20.8 12v2.4" />
    <circle className="lv-gf" cx="6.2" cy="12" r="3.9" />
    <circle className="lv-gw" cx="6.2" cy="12" r="1.2" />
  </g>,
  // 9 Trophy
  <>
    <path className="lv-gl" d="M7.5 5.6H4.6v1.8a3.2 3.2 0 0 0 3.2 3.2M16.5 5.6h2.9v1.8a3.2 3.2 0 0 1-3.2 3.2M12 14.5v3" />
    <path className="lv-gf" d="M7.5 3.8h9v6.2a4.5 4.5 0 0 1-9 0Z" />
    <path className="lv-gf" d="M8.4 17.5h7.2v2.9H8.4Z" />
  </>,
  // 10 Star
  <path className="lv-gf" d={STAR} />,
  // 11 Crown
  <>
    <path className="lv-gf" d="M4.2 18 5.6 8.2l4.4 4.3L12 6l2 6.5 4.4-4.3 1.4 9.8Z" />
    <path className="lv-gl" d="M4.6 20.9h14.8" />
    <path className="lv-gk" d="M5.6 5.3a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2ZM12 3.1a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2ZM18.4 5.3a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z" />
  </>,
  // 12 Comet
  <>
    <path className="lv-gl" d="M12.2 11.8 20 4M13.4 15.6l6.4-6.4M8.4 11.2 15.6 4" />
    <circle className="lv-gf" cx="8.6" cy="15.4" r="4.2" />
  </>,
  // 13 Feather (a quill)
  <>
    <path className="lv-gf" d="M19.6 4.4C13 3.8 7.4 7.4 7.2 13.6c0 1.8.4 3.2 1.2 4.3.8-.9 1.8-1.5 3-2 4-1.7 7.2-5.5 8.2-11.5Z" />
    <path className="lv-gl" d="M4.2 20.2 15.6 8.8" />
    <path className="lv-gl" d="M10.4 14.2l2.6.6" />
  </>,
  // 14 Rocket
  <>
    <path className="lv-gw" d="M7.9 12.6 5 15.6v3.2l3.4-1.7ZM16.1 12.6l2.9 3v3.2l-3.4-1.7Z" />
    <path className="lv-gf" d="M12 2.4c3.4 2.6 4.6 6.4 4.1 12.1H7.9C7.4 8.8 8.6 5 12 2.4Z" />
    <circle className="lv-gw" cx="12" cy="9.4" r="1.9" />
    <path className="lv-gl" d="M9.8 17.6c0 1.8.8 3.2 2.2 4.2 1.4-1 2.2-2.4 2.2-4.2" />
  </>,
  // 15 Lighthouse
  <>
    <path className="lv-gl" d="M5 6.6h3M16 6.6h3M6 3.4l2.3 1.6M18 3.4l-2.3 1.6" />
    <path className="lv-gf" d="M8.9 21.5l1.5-12.2h3.2l1.5 12.2Z" />
    <path className="lv-gl" d="M9.7 15.2h4.6M9.3 18.4h5.4M6.5 21.5h11" />
    <path className="lv-gw" d="M10.3 5.8h3.4v3.5h-3.4Z" />
    <path className="lv-gf" d="M9.4 5.8 12 3l2.6 2.8Z" />
  </>,
  // 16 Mountain
  <>
    <path className="lv-gw" d="M12.8 19.5 17.3 12l4.6 7.5Z" />
    <path className="lv-gf" d="M2.2 19.5 10 6l7.8 13.5Z" />
    <path className="lv-gw" d="M7.5 10.7 10 6l2.5 4.7-1.4-.8-1.1 1.2L8.9 9.9Z" />
    <path className="lv-gl" d="M2.2 19.5h19.7" />
  </>,
  // 17 Planet
  <g transform="rotate(-24 12 12)">
    <path className="lv-gl" d="M1.8 12A10.2 3.3 0 0 1 22.2 12" />
    <circle className="lv-gf" cx="12" cy="12" r="5.8" />
    <path className="lv-gl" d="M1.8 12A10.2 3.3 0 0 0 22.2 12" />
  </g>,
  // 18 Moon
  <>
    <path className="lv-gf" d="M19.1 15.3A8.6 8.6 0 1 1 10.4 3.9 7.2 7.2 0 0 0 19.1 15.3Z" />
    <path className="lv-gk" d="M19 4.6a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM21.4 9.2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6Z" />
  </>,
  // 19 Gem
  <>
    <path className="lv-gf" d="M7.4 4.6h9.2l4.2 5L12 20.4 3.2 9.6Z" />
    <path className="lv-gl" d="M3.2 9.6h17.6M9.2 4.6 7.6 9.6 12 20.4M14.8 4.6l1.6 5L12 20.4" />
  </>,
  // 20 Sun
  <>
    <path className="lv-gl" d={RAYS} />
    <circle className="lv-gf" cx="12" cy="12" r="4.8" />
  </>,
];

// ---------- Frames (Level 13 and up) and the ring past Level 20 ----------

/** A mini star or crown that sits on top of a laurel. Centred on x = 24, near the top of the board. */
const FINIAL_STAR = roundPoly(burst(24, 5.4, 5, 4.6, 2.1), 0.6);
const FINIAL_CROWN = "M18.2 9.4 18.9 3.6 21.6 5.7 24 2.3 26.4 5.7 29.1 3.6 29.8 9.4Z";

/** Leaves up each side from the bottom, round a centre. */
function Laurel({ cy, R }: { cy: number; R: number }) {
  const leaves: ReactNode[] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const phi = ((16 + i * 22) * Math.PI) / 180;
      const x = 24 + side * R * Math.sin(phi);
      const y = cy + R * Math.cos(phi);
      // The leaf lies along the branch and leans a little outward.
      const along = (Math.atan2(-Math.sin(phi), side * Math.cos(phi)) * 180) / Math.PI;
      leaves.push(<ellipse key={`${side}${i}`} className="lv-leaf" cx={num(x)} cy={num(y)} rx="1.8" ry="3.5" transform={`rotate(${num(along - 90 + side * 26)} ${num(x)} ${num(y)})`} />);
    }
  }
  const branch = (side: number) => {
    const p = (t: number): Pt => [24 + side * (R - 1.6) * Math.sin(t), cy + (R - 1.6) * Math.cos(t)];
    return `M${pt(p((8 * Math.PI) / 180))}A${R - 1.6} ${R - 1.6} 0 0 ${side > 0 ? 0 : 1} ${pt(p((132 * Math.PI) / 180))}`;
  };
  return (
    <g>
      <path className="lv-stem" d={`${branch(-1)}${branch(1)}`} />
      {leaves}
    </g>
  );
}

/** The ribbon under a medal: a label with a folded tail at each end. */
function Ribbon({ numeral, fs }: { numeral?: string; fs: number }) {
  return (
    <g>
      <path className="lv-tail" d="M8.5 37.4H2.4l4.2 4.8L2.4 47h6.1Z" />
      <path className="lv-tail" d="M39.5 37.4h6.1l-4.2 4.8 4.2 4.8h-6.1Z" />
      <path className="lv-label" d="M8.5 35.2h31v10.4h-31Z" />
      {numeral && (
        <text className="lv-num" x="24" y={num(40.4 + fs * 0.36)} fontSize={fs} textAnchor="middle">
          {numeral}
        </text>
      )}
    </g>
  );
}

/** Past the last prize: a ring of beads round the edge, and a fine line more the more times round. */
function Beads({ lap }: { lap: number }) {
  const dots = Array.from({ length: 28 }, (_, i) => {
    const a = (i * 2 * Math.PI) / 28;
    return <circle key={i} className="lv-bead" cx={num(24 + 22.6 * Math.cos(a))} cy={num(24 + 22.6 * Math.sin(a))} r="0.95" />;
  });
  return (
    <g>
      <circle className="lv-ring" cx="24" cy="24" r="22.6" />
      {dots}
      {lap >= 2 && <circle className="lv-ring fine" cx="24" cy="24" r="20.7" />}
      {lap >= 3 && <circle className="lv-ring fine" cx="24" cy="24" r="19.4" />}
    </g>
  );
}

// ---------- Sizes ----------

const PX: Record<PrizeSize, number> = { sm: 20, md: 28, lg: 44, xl: 72 };
const ORDER: PrizeSize[] = ["sm", "md", "lg", "xl"];
/** How big the drawing is (a share of its 24-unit grid) at each size. */
const DRAW: Record<PrizeSize, number> = { sm: 1, md: 0.92, lg: 0.9, xl: 0.84 };
/** The line weight on screen, in pixels: the drawing, and the dashed outline. */
const LINE: Record<PrizeSize, number> = { sm: 1, md: 1.3, lg: 1.6, xl: 2 };
const EDGE: Record<PrizeSize, number> = { sm: 1.25, md: 1.5, lg: 1.5, xl: 1.7 };

/** How a shape is dashed: a dash centred on the first point, the rest evenly round (the outline is measured as 100). */
function dashes(shape: Shape, size: PrizeSize, state: PrizeState) {
  const count = shape.dash[ORDER.indexOf(size)];
  const period = 100 / count;
  const dash = period * (state === "next" ? 0.62 : 0.5);
  return { strokeDasharray: `${num(dash)} ${num(period - dash)}`, strokeDashoffset: num(dash / 2 - shape.phase * period) };
}

/** Where the medal sits when there is a frame round it. */
const MEDAL: Record<Frame, string> = {
  ribbon: `translate(0 -3.2) ${scaleAbout(24, 24, 0.8)}`,
  star: `translate(0 2.6) ${scaleAbout(24, 24, 0.7)}`,
  crown: `translate(0 2.6) ${scaleAbout(24, 24, 0.7)}`,
};
const MEDAL_K: Record<Frame, number> = { ribbon: 0.8, star: 0.7, crown: 0.7 };

/**
 * The prize for one level.
 *  reached: the level you are on (full colour)      passed: a level you have won (full colour)
 *  next:    the same emblem, dashed, in its colour  later:  the same emblem, dashed, in grey
 * `showNumber` puts the level number on it: by default on sm (the number is the content) and xl (a small numeral on the ribbon
 * or under the drawing). On md it swaps the drawing for the number; on lg it adds a small number plate.
 * From Level 13 the ribbon, laurel and crest only show on lg and xl; smaller, you see the medal alone.
 * Set `decorative` when words beside it already name the level and prize.
 */
export function LevelPrize({
  level,
  state = "reached",
  size = "md",
  decorative = false,
  showNumber,
}: {
  level: number;
  state?: PrizeState;
  size?: PrizeSize;
  decorative?: boolean;
  showNumber?: boolean;
}) {
  const p = prizeFor(level);
  const sh = SHAPES[p.art];
  const dashed = state === "next" || state === "later";
  const numeral = showNumber ?? (size === "sm" || size === "xl");
  const numberOnly = numeral && (size === "sm" || size === "md");
  const big = size === "lg" || size === "xl";
  const frame = big && !numberOnly ? sh.frame : undefined;
  const onRibbon = numeral && big && frame === "ribbon";
  const under = numeral && size === "xl" && !onRibbon;
  const plate = numeral && size === "lg" && !onRibbon;
  const drawn = !numberOnly;

  const text = String(p.level);
  const digits = Math.min(text.length, 3);
  const faceC = sh.c ?? [24, 24];
  const faceD = sh.face ?? sh.outline;
  const kMedal = frame ? MEDAL_K[frame] : 1;
  const px = PX[size] / 48;

  // The drawing, centred on the face (higher up when a numeral goes under it).
  const gs = size === "xl" ? (sh.xs ?? DRAW.xl) : DRAW[size];
  const [gx, gy] = under ? sh.atNum : sh.at;
  const glyphT = `translate(${num(gx - 12 * gs)} ${num(gy - 12 * gs)}) scale(${gs})`;
  const draw = { "--gw": num(LINE[size] / (gs * px * kMedal)) } as CSSProperties;
  const edge = { strokeWidth: num(EDGE[size] / (px * kMedal)) };

  // A numeral that fills the face (sm and md), or sits under the drawing (xl), or in a plate (lg).
  let numEl: ReactNode = null;
  if (numberOnly) {
    const fs = size === "sm" ? [26, 22.5, 18][digits - 1] * (p.art === 3 ? 0.9 : 1) : [19, 16.5, 13][digits - 1];
    numEl = (
      <text className="lv-num" x={num(24 + (text === "1" ? -0.5 : 0))} y={num(24 + fs * 0.36)} fontSize={fs} textAnchor="middle">
        {text}
      </text>
    );
  } else if (under) {
    const fs = [8.4, 7.4, 6.2][digits - 1] * (frame ? 1.18 : 1);
    numEl = (
      <text className="lv-num" x={num(sh.num[0])} y={num(sh.num[1])} fontSize={num(fs)} textAnchor="middle">
        {text}
      </text>
    );
  }

  const medal = (
    <>
      {dashed ? (
        <>
          <path className="lv-soft" d={sh.outline} />
          <path className="lv-dash" d={sh.outline} pathLength={100} style={edge} {...dashes(sh, size, state)} />
        </>
      ) : (
        <>
          <path className="lv-band" d={sh.outline} />
          <path className="lv-face" d={faceD} transform={scaleAbout(faceC[0], faceC[1], sh.k[0], sh.k[1])} />
          {sh.frame === "star" && p.art === 16 && big && <Studs />}
        </>
      )}
      {drawn && (
        <g className="lv-draw" transform={glyphT} style={draw}>
          {GLYPHS[p.art]}
        </g>
      )}
      {numEl}
    </>
  );

  const body = (
    <>
      {frame === "star" || frame === "crown" ? (
        <g className="lv-crest">
          <Laurel cy={25.4} R={20.4} />
          <path className="lv-fin" d={frame === "star" ? FINIAL_STAR : FINIAL_CROWN} />
        </g>
      ) : null}
      {frame ? <g transform={MEDAL[frame]}>{medal}</g> : medal}
      {frame === "ribbon" && <Ribbon numeral={onRibbon ? text : undefined} fs={[8, 7, 6][digits - 1]} />}
      {plate && (
        <g>
          <rect className="lv-plate" x={num(24 - (7 + digits * 5.6) / 2)} y="34.5" width={num(7 + digits * 5.6)} height="12.5" rx="6.25" />
          <text className="lv-num" x="24" y="43.6" fontSize="9.4" textAnchor="middle">
            {text}
          </text>
        </g>
      )}
    </>
  );

  return (
    <span
      className={`lv-prize ${size} ${state}`}
      data-art={p.art + 1}
      style={hueStyle(p.hue)}
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": `Level ${p.level} prize, ${p.words}, ${SAY[state]}` })}
    >
      <svg viewBox="0 0 48 48" focusable="false" aria-hidden="true">
        {p.lap > 0 ? (
          <>
            <Beads lap={p.lap} />
            <g transform={scaleAbout(24, 24, 0.84)}>{body}</g>
          </>
        ) : (
          body
        )}
      </svg>
    </span>
  );
}

/** The milled edge of the coin on Level 17: small round studs on its band. */
function Studs() {
  return (
    <g className="lv-studs">
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i * 2 * Math.PI) / 24;
        return <circle key={i} cx={num(24 + 20.3 * Math.cos(a))} cy={num(24 + 20.3 * Math.sin(a))} r="0.8" />;
      })}
    </g>
  );
}

export { PX as PRIZE_PX };
