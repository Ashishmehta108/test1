"use client";

import { useEffect, useState } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const two = (n: number) => String(n).padStart(2, "0");

/** The darkest square is the busiest hour; the others are shaded against it in four steps. */
function level(v: number, max: number): number {
  if (!v) return 0;
  return Math.min(4, Math.max(1, Math.ceil((v / max) * 4)));
}

/**
 * When opens happen: a square for every hour of every weekday, darker = more opens.
 * Hours and days are the viewer's own, so this is worked out in the browser.
 * Put <HeatKey /> in the card's `aside` to explain the shading.
 */
export function Heatmap({ times, noun = "open" }: { times: string[]; noun?: string }) {
  const [grid, setGrid] = useState<number[][] | null>(null);

  useEffect(() => {
    const g = DAYS.map(() => Array<number>(24).fill(0));
    for (const iso of times) {
      const d = new Date(iso);
      g[(d.getDay() + 6) % 7][d.getHours()]++;
    }
    setGrid(g);
  }, [times]);

  const rows = grid ?? DAYS.map(() => Array<number>(24).fill(0));
  const max = Math.max(1, ...rows.flat());

  return (
    <div className="heat" role="img" aria-label={`${times.length} ${noun}s by weekday and hour`}>
      {rows.map((row, d) => (
        <div key={d} style={{ display: "contents" }}>
          <span>{DAYS[d]}</span>
          <div className="heat-row">
            {row.map((v, h) => (
              <i key={h} data-l={level(v, max)} data-tip={`${DAYS[d]}, ${two(h)}:00 to ${two((h + 1) % 24)}:00 · ${v} ${v === 1 ? noun : `${noun}s`}`} />
            ))}
          </div>
        </div>
      ))}
      <span />
      <div className="heat-hours" aria-hidden="true">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
      </div>
    </div>
  );
}

export function HeatKey() {
  return (
    <span className="heat-key" aria-hidden="true">
      <span>Fewer</span>
      <i />
      <i />
      <i />
      <i />
      <i />
      <span>More</span>
    </span>
  );
}
