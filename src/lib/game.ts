/*
 * The leaderboard's rules, in one place and in plain code: points, levels, stamps and streaks.
 * Nothing here reads the database. Everything is worked out from numbers that already exist
 * (emails sent, opened, clicked), so the rules can be read and tested on their own.
 */

// ---------- Points ----------

/** Every tracked email that was sent. */
export const POINTS_SENT = 1;
/** Added when it was opened (a real open; "maybe opened" earns nothing extra). */
export const POINTS_OPENED = 3;
/** Added when a link in it was clicked. */
export const POINTS_CLICKED = 2;

/** "1 point for each email sent, 3 more when it is opened, 2 more when a link in it is clicked." */
export const POINTS_RULE = `${POINTS_SENT} point for each tracked email you send, ${POINTS_OPENED} more when it is opened, and ${POINTS_CLICKED} more when a link in it is clicked.`;

export type EmailOutcome = "draft" | "sent" | "maybe" | "opened" | "clicked";

/** Points one email earned: 0 if never sent, 1 sent, 4 opened, 6 clicked. */
export function pointsForEmail(status: EmailOutcome, sent = status !== "draft"): number {
  if (!sent || status === "draft") return 0;
  if (status === "clicked") return POINTS_SENT + POINTS_OPENED + POINTS_CLICKED;
  if (status === "opened") return POINTS_SENT + POINTS_OPENED;
  return POINTS_SENT;
}

/** Points from totals. `opened` counts emails opened (clicked ones included), `clicked` emails with a link clicked. */
export function points(t: { sent: number; opened: number; clicked: number }): number {
  return t.sent * POINTS_SENT + t.opened * POINTS_OPENED + t.clicked * POINTS_CLICKED;
}

// ---------- Ranking ----------

/**
 * Positions with ties shared: 40, 40, 12 → 1, 1, 3. Sorted by points (most first), then name.
 * Returns a new list, each row with its `position`.
 */
export function rank<T extends { points: number; name: string }>(rows: T[]): (T & { position: number })[] {
  const sorted = [...rows].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  let position = 0;
  return sorted.map((r, i) => {
    if (i === 0 || r.points !== sorted[i - 1].points) position = i + 1;
    return { ...r, position };
  });
}

export type Move = { kind: "up" | "down" | "same" | "new" | "none"; by: number };

/** How a person moved against the period before. `before` is null when they had no points then. */
export function movement(now: number, before: number | null, pointsNow: number): Move {
  if (pointsNow === 0) return { kind: "none", by: 0 };
  if (before === null) return { kind: "new", by: 0 };
  if (before > now) return { kind: "up", by: before - now };
  if (before < now) return { kind: "down", by: now - before };
  return { kind: "same", by: 0 };
}

/** "1st", "2nd", "3rd", "4th", "11th", "22nd". */
export function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${s}`;
}

// ---------- Levels ----------

/** All-time points needed for each level: Level 1 starts at 0, Level 2 at 25, and so on. */
/** Where each of the 20 levels starts, in all-time points. Each has its own prize (src/components/game/LevelPrize.tsx). */
export const LEVELS = [0, 25, 75, 150, 300, 500, 800, 1200, 1700, 2300, 3000, 4000, 5200, 6600, 8200, 10000, 12000, 14500, 17500, 21000] as const;
/** Past Level 20, every further level is this many points more. */
const LEVEL_STEP_AFTER = 4000;

/** All-time points at which a level starts: levelStart(1) is 0, levelStart(2) is 25, and so on. */
export function levelStart(level: number): number {
  if (level <= LEVELS.length) return LEVELS[level - 1];
  return LEVELS[LEVELS.length - 1] + (level - LEVELS.length) * LEVEL_STEP_AFTER;
}

export type Level = { level: number; from: number; to: number; toGo: number; progress: number };

/** The level for a number of all-time points, and how far it is to the next one (progress 0 to 1). */
export function levelFor(total: number): Level {
  let level = 1;
  while (levelStart(level + 1) <= total) level++;
  const from = levelStart(level);
  const to = levelStart(level + 1);
  return { level, from, to, toGo: to - total, progress: (total - from) / (to - from) };
}

// ---------- Streaks ----------
// A streak counts working days (Monday to Friday) in a row on which at least one tracked email was sent.
// Saturdays and Sundays neither break nor extend it. Days are the viewer's own days, so these run in the browser.

/** "2026-11-23": a local day as text. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isWeekend(d: Date): boolean {
  return d.getDay() === 0 || d.getDay() === 6;
}

/** The working day before `d` (local), skipping a weekend. */
function prevWorkday(d: Date): Date {
  const p = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  while (isWeekend(p)) p.setDate(p.getDate() - 1);
  return p;
}

/** The set of local days on which something was sent. */
export function sendDays(times: (string | Date)[]): Set<string> {
  return new Set(times.map((t) => dayKey(new Date(t))));
}

/**
 * The streak still running: working days in a row with a send, ending today or on the last working day
 * (so a streak isn't lost in the morning before today's first email).
 */
export function currentStreak(days: Set<string>, today: Date = new Date()): number {
  let d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  while (isWeekend(d)) d.setDate(d.getDate() - 1);
  if (!days.has(dayKey(d))) d = prevWorkday(d);
  let n = 0;
  while (days.has(dayKey(d))) {
    n++;
    d = prevWorkday(d);
  }
  return n;
}

/** The longest run of working days in a row with a send, counting only the last `span` days up to today. */
export function bestStreak(days: Set<string>, span: number, today: Date = new Date()): number {
  let best = 0;
  let run = 0;
  for (let i = span - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    if (isWeekend(d)) continue;
    run = days.has(dayKey(d)) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** The last `n` working days up to today (oldest first), each with whether something was sent. */
export function recentWorkdays(days: Set<string>, n: number, today: Date = new Date()): { key: string; date: Date; sent: boolean }[] {
  const out: { key: string; date: Date; sent: boolean }[] = [];
  let d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  while (isWeekend(d)) d.setDate(d.getDate() - 1);
  while (out.length < n) {
    out.unshift({ key: dayKey(d), date: d, sent: days.has(dayKey(d)) });
    d = prevWorkday(d);
  }
  return out;
}

// ---------- Stamps ----------

/** Everything the stamps look at, for one person. All time unless the name says otherwise. */
export type StampFacts = {
  sent: number;
  opened: number;
  linkClicks: number;
  /** Quickest time from sending to the first open, in milliseconds (null if nothing was opened). */
  fastestOpenMs: number | null;
  /** The most times any one email was opened. */
  mostOpens: number;
  /** Longest streak in the last 90 days (worked out in the browser). */
  bestStreak90: number;
  sent30: number;
  opened30: number;
};

export type Stamp = {
  id: string;
  /** What is written inside the seal: a short number or two letters. */
  mark: string;
  name: string;
  /** One line: how to earn it. */
  how: string;
  /** How far along: `have` of `need`. Earned when have >= need. */
  progress: (f: StampFacts) => { have: number; need: number; unit?: string };
};

const count = (have: number, need: number, unit?: string) => ({ have: Math.min(have, need), need, unit });

export const STAMPS: Stamp[] = [
  { id: "first-email", mark: "1st", name: "First email", how: "Send your first tracked email.", progress: (f) => count(f.sent, 1, "sent") },
  { id: "opened-10", mark: "10", name: "Ten opened", how: "Have 10 of your emails opened.", progress: (f) => count(f.opened, 10, "opened") },
  { id: "first-click", mark: "Lk", name: "First click", how: "Have someone click a link in one of your emails.", progress: (f) => count(f.linkClicks, 1, "clicked") },
  { id: "quick-open", mark: "5m", name: "Quick reply", how: "Have an email opened within 5 minutes of sending it.", progress: (f) => count(f.fastestOpenMs !== null && f.fastestOpenMs <= 5 * 60_000 ? 1 : 0, 1) },
  { id: "read-again", mark: "5+", name: "Read again", how: "Have one email opened 5 or more times.", progress: (f) => count(f.mostOpens, 5, "opens") },
  { id: "streak-5", mark: "5d", name: "Full week", how: "Send a tracked email on 5 working days in a row.", progress: (f) => count(f.bestStreak90, 5, "days") },
  { id: "links-25", mark: "25", name: "25 clicks", how: "Get 25 link clicks across your emails.", progress: (f) => count(f.linkClicks, 25, "clicks") },
  { id: "opened-50", mark: "50", name: "Fifty opened", how: "Have 50 of your emails opened.", progress: (f) => count(f.opened, 50, "opened") },
  {
    id: "open-rate-70",
    mark: "70",
    name: "Well read",
    how: "Get 70% or more of your emails opened over 30 days, with at least 10 sent.",
    // Progress is the opened count needed: 70% of what was sent, and never less than 7 of 10.
    progress: (f) => {
      const need = Math.max(7, Math.ceil(f.sent30 * 0.7));
      return f.sent30 >= 10 ? count(f.opened30, need, "opened") : count(f.sent30, 10, "sent");
    },
  },
  { id: "streak-10", mark: "10d", name: "Two full weeks", how: "Send a tracked email on 10 working days in a row.", progress: (f) => count(f.bestStreak90, 10, "days") },
  { id: "opened-100", mark: "100", name: "A hundred opened", how: "Have 100 of your emails opened.", progress: (f) => count(f.opened, 100, "opened") },
];

export function earned(stamp: Stamp, f: StampFacts): boolean {
  const p = stamp.progress(f);
  return p.have >= p.need;
}

export function earnedCount(f: StampFacts): number {
  return STAMPS.filter((s) => earned(s, f)).length;
}

/** The median of some numbers (the middle one; the lower middle for an even count), or null. */
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)];
}

/** "40 min", "3 hours", "2 days": how long something took, in plain words. */
export function howLong(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 1) return "Under a minute";
  if (min < 60) return `${min} min`;
  const hours = Math.round(min / 60);
  if (hours < 48) return hours === 1 ? "1 hour" : `${hours} hours`;
  return `${Math.round(hours / 24)} days`;
}

/** A stamp still to earn, with how far along it is. */
export type NextStamp = { stamp: Stamp; have: number; need: number; unit?: string };

/** The stamps a person has, in the order they are listed. */
export function earnedStamps(f: StampFacts): Stamp[] {
  return STAMPS.filter((s) => earned(s, f));
}

/** The next stamps to aim for: closest to done first, then in list order. */
export function nextStamps(f: StampFacts, n = 3): NextStamp[] {
  return STAMPS.filter((s) => !earned(s, f))
    .map((stamp, i) => ({ stamp, i, ...stamp.progress(f) }))
    .sort((a, b) => b.have / b.need - a.have / a.need || a.i - b.i)
    .slice(0, n)
    .map(({ stamp, have, need, unit }) => ({ stamp, have, need, unit }));
}

/** Which of an email's three point steps it has earned so far: sent (+1), opened (+3), link clicked (+2). */
export function emailPointSteps(status: EmailOutcome): { key: "sent" | "opened" | "clicked"; label: string; points: number; earned: boolean }[] {
  return [
    { key: "sent", label: "Sent", points: POINTS_SENT, earned: status !== "draft" },
    { key: "opened", label: "Opened", points: POINTS_OPENED, earned: status === "opened" || status === "clicked" },
    { key: "clicked", label: "Link clicked", points: POINTS_CLICKED, earned: status === "clicked" },
  ];
}

/** The most one email can earn. */
export const POINTS_MAX = POINTS_SENT + POINTS_OPENED + POINTS_CLICKED;

/** One plain line explaining an email's points so far, for a hover note. */
export function emailPointsNote(status: EmailOutcome): string {
  switch (status) {
    case "draft":
      return `Worth ${POINTS_SENT} point once it's sent`;
    case "sent":
      return `${POINTS_SENT} for sending. ${POINTS_OPENED} more when it's opened`;
    case "maybe":
      return `${POINTS_SENT} for sending. Maybe opened earns nothing extra`;
    case "opened":
      return `${POINTS_SENT} for sending, ${POINTS_OPENED} for the open. ${POINTS_CLICKED} more for a click`;
    case "clicked":
      return `${POINTS_SENT} for sending, ${POINTS_OPENED} for the open, ${POINTS_CLICKED} for the click`;
  }
}
