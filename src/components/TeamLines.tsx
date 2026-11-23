"use client";

import { format, startOfDay, subDays } from "date-fns";
import { useEffect, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { ChartCard, ChartEmpty, Legend, SERIES, SERIES_OTHER } from "./charts";

const DAYS = 30;
const W = 600;
const H = 190;

type Line = { id: string; name: string; color: string; totals: number[] };

/**
 * One line per person: the running total of emails they tracked over the last 30 days.
 * A person keeps the same colour whoever else is on the chart.
 * Days are the viewer's own days, so it is worked out in the browser.
 */
export function TeamLines({ people, sent }: { people: { id: string; name: string }[]; sent: { owner: string; at: string }[] }) {
  const [data, setData] = useState<{ labels: string[]; lines: Line[] } | null>(null);
  // The day being pointed at (0 = 30 days ago, 29 = today), or nothing.
  const [day, setDay] = useState<number | null>(null);

  useEffect(() => {
    const today = startOfDay(new Date());
    const days = Array.from({ length: DAYS }, (_, i) => subDays(today, DAYS - 1 - i));
    const index = new Map(days.map((d, i) => [d.getTime(), i]));
    const perDay = new Map(people.map((p) => [p.id, Array<number>(DAYS).fill(0)]));
    for (const s of sent) {
      const i = index.get(startOfDay(new Date(s.at)).getTime());
      const row = perDay.get(s.owner);
      if (i !== undefined && row) row[i]++;
    }
    const lines = people
      .map((p, n) => {
        let run = 0;
        return { id: p.id, name: p.name, color: SERIES[n] ?? SERIES_OTHER, totals: perDay.get(p.id)!.map((v) => (run += v)) };
      })
      .filter((l) => l.totals[DAYS - 1] > 0)
      .sort((a, b) => b.totals[DAYS - 1] - a.totals[DAYS - 1]);
    setData({ labels: days.map((d) => format(d, "d MMM")), lines });
  }, [people, sent]);

  const lines = data?.lines ?? [];
  const max = Math.max(1, ...lines.map((l) => l.totals[DAYS - 1]));
  const x = (i: number) => (i / (DAYS - 1)) * W;
  const y = (v: number) => H - 4 - (v / max) * (H - 16);

  const point = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - box.left) / box.width) * (DAYS - 1));
    setDay(Math.min(DAYS - 1, Math.max(0, i)));
  };
  const step = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setDay((d) => Math.min(DAYS - 1, Math.max(0, (d ?? DAYS - 1) + (e.key === "ArrowLeft" ? -1 : 1))));
  };
  // Who had tracked anything by that day, most first.
  const atDay = day === null ? [] : lines.filter((l) => l.totals[day] > 0).sort((a, b) => b.totals[day] - a.totals[day]);

  return (
    <ChartCard title="Everyone, last 30 days" note="Emails tracked so far by each person">
      {data && lines.length === 0 ? (
        <ChartEmpty>Nobody has sent a tracked email in the last 30 days.</ChartEmpty>
      ) : (
        <>
          <div
            className="lines"
            tabIndex={0}
            aria-label="Emails tracked by each person, day by day. Use the left and right arrow keys to move between days."
            onPointerMove={point}
            onPointerDown={point}
            onPointerLeave={() => setDay(null)}
            onFocus={() => setDay((d) => d ?? DAYS - 1)}
            onBlur={() => setDay(null)}
            onKeyDown={step}
          >
            <span className="lines-max">{data ? max : " "}</span>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={lines.map((l) => `${l.name}: ${l.totals[DAYS - 1]}`).join(", ")}>
              {[0.25, 0.5, 0.75].map((f) => (
                <line key={f} x1="0" x2={W} y1={y(max * f)} y2={y(max * f)} className="lines-grid" />
              ))}
              {lines.map((l) => (
                <polyline key={l.id} points={l.totals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")} stroke={l.color} />
              ))}
            </svg>
            {data && day !== null && (
              <>
                <span className="lines-cross" style={{ left: `${(day / (DAYS - 1)) * 100}%` }} />
                {atDay.map((l) => (
                  <span
                    key={l.id}
                    className="lines-dot"
                    style={{ left: `${(day / (DAYS - 1)) * 100}%`, top: `${(y(l.totals[day]) / H) * 100}%`, "--c": l.color } as CSSProperties}
                  />
                ))}
                <div className={`chart-tip ${day < DAYS / 2 ? "right" : "left"}`} style={{ left: `${(day / (DAYS - 1)) * 100}%` }} role="status">
                  <span className="tip-title">{day === DAYS - 1 ? `Today, ${data.labels[day]}` : data.labels[day]}</span>
                  {atDay.length === 0 ? (
                    <span className="tip-none">Nothing tracked yet</span>
                  ) : (
                    <dl>
                      {atDay.map((l) => (
                        <div key={l.id} style={{ display: "contents" }}>
                          <i style={{ "--c": l.color } as CSSProperties} />
                          <dt>{l.name}</dt>
                          <dd>{l.totals[day]}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="chart-axis" aria-hidden="true">
            <span>{data?.labels[0] ?? " "}</span>
            <span>{data ? "Today" : " "}</span>
          </div>
          <Legend items={lines.map((l) => ({ label: l.name, color: l.color, value: l.totals[DAYS - 1] }))} />
        </>
      )}
    </ChartCard>
  );
}
