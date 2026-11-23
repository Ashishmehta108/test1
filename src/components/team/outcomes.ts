import { OUTCOME, type Slice } from "@/components/charts";

type Counted = "clicked" | "opened" | "maybe" | "waiting";

/** The four things that can have happened to an email that was sent, in the order the bar shows them. */
const ORDER: Counted[] = ["clicked", "opened", "maybe", "waiting"];

/** The key under each colour: shown once at the top of the people list. */
export const TEAM_LEGEND = ORDER.map((k) => ({ label: OUTCOME[k].label, color: OUTCOME[k].color }));

/** One person's counts turned into the parts of their bar. */
export function outcomeSlices(counts: Record<Counted, number>): Slice[] {
  return ORDER.map((k) => ({ key: k, label: OUTCOME[k].label, value: counts[k], color: OUTCOME[k].color }));
}
