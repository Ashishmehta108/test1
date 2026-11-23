import type { Status } from "@/db/schema";

/**
 * The colours charts use. Always take them from here so every chart agrees.
 * OUTCOME: what happened to an email (matches the status tags).
 * SERIES: tells things apart (devices, people). Use them in this order; never loop back to the start.
 */
export const OUTCOME = {
  clicked: { label: "Clicked a link", color: "var(--m-clicked)" },
  opened: { label: "Opened", color: "var(--m-opened)" },
  maybe: { label: "Maybe opened", color: "var(--m-maybe)" },
  waiting: { label: "Not opened yet", color: "var(--m-waiting)" },
  draft: { label: "Not sent yet", color: "var(--m-draft)" },
} as const;
export type OutcomeKey = keyof typeof OUTCOME;

/** Which outcome a saved status counts as. */
export const STATUS_OUTCOME: Record<Status, OutcomeKey> = {
  clicked: "clicked",
  opened: "opened",
  maybe: "maybe",
  sent: "waiting",
  draft: "draft",
};

export const SERIES = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "var(--series-6)",
  "var(--series-7)",
  "var(--series-8)",
] as const;
export const SERIES_OTHER = "var(--series-other)";

export type Slice = { key: string; label: string; value: number; color: string };

/**
 * Gives each row a series colour in order. Past the last colour (or past `keep` rows),
 * the rest are added together into one grey "Other" slice.
 */
export function withSeriesColors(rows: { label: string; value: number }[], keep: number = SERIES.length, otherLabel = "Other"): Slice[] {
  const top = rows.slice(0, Math.min(keep, SERIES.length));
  const rest = rows.slice(top.length).reduce((n, r) => n + r.value, 0);
  const out: Slice[] = top.map((r, i) => ({ key: r.label, label: r.label, value: r.value, color: SERIES[i] }));
  if (rest > 0) out.push({ key: "__other", label: otherLabel, value: rest, color: SERIES_OTHER });
  return out;
}

export function pct(part: number, whole: number): string {
  if (!whole) return "—";
  const p = (part / whole) * 100;
  if (p > 0 && p < 1) return "<1%";
  return `${Math.round(p)}%`;
}
