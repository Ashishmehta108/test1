import type { CSSProperties } from "react";

/**
 * Thin upright bars, one per slot (an hour, a weekday). Pointing at a slot shows `tips[i]`.
 * `labels[i]` is written under the slot; use null to leave one blank.
 */
export function Columns({
  values,
  labels,
  tips,
  color,
  label,
}: {
  values: number[];
  labels: (string | null)[];
  tips: string[];
  color?: string;
  label: string;
}) {
  const max = Math.max(1, ...values);
  const vars = { "--n": values.length, ...(color ? { "--c": color } : {}) } as CSSProperties;
  return (
    <>
      <div className="vbars" style={vars} role="img" aria-label={label}>
        {values.map((v, i) => (
          <div key={i} data-tip={tips[i]}>
            {v > 0 && <i style={{ height: `${Math.max(4, (v / max) * 100)}%` }} />}
          </div>
        ))}
      </div>
      <div className="vaxis" style={vars} aria-hidden="true">
        {labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </>
  );
}
