"use client";

import { useState, type CSSProperties } from "react";
import { pct, type Slice } from "./colors";

const R = 50;
const C = 2 * Math.PI * R;
const GAP = 1.6; // about 2px of card colour between slices

/**
 * A donut: parts of a whole. The list beside it carries the names and numbers, so nothing
 * depends on colour alone. Pointing at a slice (or a line of the list) shows that part in the middle.
 *
 * `centerValue` / `centerLabel` are what the middle says when nothing is pointed at,
 * for example "62%" / "opened".
 */
export function Donut({
  slices,
  centerValue,
  centerLabel,
  size = 168,
  label,
}: {
  slices: Slice[];
  centerValue: string;
  centerLabel: string;
  size?: number;
  /** Read out by screen readers, for example "What happened to 48 emails". */
  label: string;
}) {
  const [on, setOn] = useState<string | null>(null);
  const shown = slices.filter((s) => s.value > 0);
  const total = shown.reduce((n, s) => n + s.value, 0);
  const active = shown.find((s) => s.key === on);

  let start = 0;
  const arcs = shown.map((s) => {
    const len = (s.value / total) * C;
    const drawn = shown.length > 1 ? Math.max(0.6, len - GAP) : len;
    const arc = { ...s, dash: `${drawn} ${C - drawn}`, offset: -(start + (len - drawn) / 2) };
    start += len;
    return arc;
  });

  return (
    <div className="donut-box">
    <div className="donut">
      <div className="donut-ring" style={{ "--size": `${size}px` } as CSSProperties}>
        <svg viewBox="0 0 120 120" role="img" aria-label={`${label}: ${shown.map((s) => `${s.label} ${s.value}`).join(", ") || "nothing yet"}`}>
          <circle className="donut-track" cx="60" cy="60" r={R} />
          {arcs.map((a) => (
            <circle
              key={a.key}
              cx="60"
              cy="60"
              r={R}
              stroke={a.color}
              strokeDasharray={a.dash}
              strokeDashoffset={a.offset}
              className={on && on !== a.key ? "dim" : undefined}
              onPointerEnter={() => setOn(a.key)}
              onPointerLeave={() => setOn(null)}
            />
          ))}
        </svg>
        <div className="donut-center" aria-hidden="true">
          <b>{active ? active.value : centerValue}</b>
          <span>{active ? active.label : centerLabel}</span>
        </div>
      </div>
      <ul className="donut-list">
        {slices.map((s) => (
          <li
            key={s.key}
            tabIndex={s.value > 0 ? 0 : undefined}
            className={on === s.key ? "on" : undefined}
            onPointerEnter={() => s.value > 0 && setOn(s.key)}
            onPointerLeave={() => setOn(null)}
            onFocus={() => s.value > 0 && setOn(s.key)}
            onBlur={() => setOn(null)}
          >
            <i style={{ "--c": s.color } as CSSProperties} />
            <span className="lbl">{s.label}</span>
            <span className="n">{s.value}</span>
            <span className="p">{pct(s.value, total)}</span>
          </li>
        ))}
      </ul>
    </div>
    </div>
  );
}
