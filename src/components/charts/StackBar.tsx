import type { CSSProperties } from "react";
import { pct, type Slice } from "./colors";

/**
 * One thin bar split into parts: a small "parts of a whole" for tight places (a row in a list,
 * the side of a page). Pointing at a part says what it is. Pair it with a <Legend> or visible numbers.
 */
export function StackBar({ slices, label }: { slices: Slice[]; label: string }) {
  const shown = slices.filter((s) => s.value > 0);
  const total = shown.reduce((n, s) => n + s.value, 0);
  if (!total) return <div className="stackbar-empty" role="img" aria-label={`${label}: nothing yet`} />;
  return (
    <div className="stackbar" role="img" aria-label={`${label}: ${shown.map((s) => `${s.label} ${s.value}`).join(", ")}`}>
      {shown.map((s) => (
        <span key={s.key} style={{ flexGrow: s.value, flexBasis: 0, "--c": s.color } as CSSProperties} data-tip={`${s.label} · ${s.value} · ${pct(s.value, total)}`} />
      ))}
    </div>
  );
}
