import type { CSSProperties, ReactNode } from "react";
import { pct } from "./colors";

export type RankRow = {
  label: string;
  value: number;
  /** A mark colour (from colors.ts). Leave out for the default green. */
  color?: string;
  /** Grey bar, for the "nothing happened" line (for example "Not opened yet"). */
  quiet?: boolean;
  /** Replaces the "· 42%" after the number, for example "of sent". */
  note?: ReactNode;
};

/**
 * A short ranked list: a name, a thin bar, the number and its share.
 * Bars are sized against the biggest row unless `max` is given (pass the total for a funnel).
 */
export function RankBars({ rows, total, max, labelWidth }: { rows: RankRow[]; total: number; max?: number; labelWidth?: number }) {
  const top = Math.max(1, max ?? Math.max(...rows.map((r) => r.value)));
  return (
    <div className="hbars" style={labelWidth ? ({ "--label-w": `${labelWidth}px` } as CSSProperties) : undefined}>
      {rows.map((r) => (
        <div className="hbar" key={r.label}>
          <span title={r.label}>{r.label}</span>
          <span className="track">
            <span
              className={`fill${r.quiet ? " quiet" : ""}${r.value ? "" : " none"}`}
              style={{ width: `${(r.value / top) * 100}%`, ...(r.color ? ({ "--c": r.color } as CSSProperties) : {}) }}
            />
          </span>
          <span className="n">
            <b>{r.value}</b> · {r.note ?? pct(r.value, total)}
          </span>
        </div>
      ))}
    </div>
  );
}
