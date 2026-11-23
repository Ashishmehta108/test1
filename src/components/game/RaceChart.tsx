"use client";

import { format, startOfDay, subDays } from "date-fns";
import { useEffect, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { ChartCard, ChartEmpty, Legend } from "@/components/charts";

const DAYS = 30;
const W = 600;
const H = 190;

export type RacePerson = { id: string; name: string; color: string };
export type RaceItem = { o: string; at: string; p: number };

type Line = { id: string; name: string; color: string; totals: number[] };

/**
 * The race: one line per person, the running total of points they have earned over the last 30 days.
 * Each person keeps the colour the page gave them. The viewer's own line is a little thicker and sits on top.
 * Days are the viewer's own days, so it is worked out in the browser.
 */
export function RaceChart({ people, items, meId }: { people: RacePerson[]; items: RaceItem[]; meId: string }) {
  const [data, setData] = useState<{ labels: string[]; lines: Line[] } | null>(null);
  // The day being pointed at (0 = 30 days ago, 29 = today), or nothing.
  const [day, setDay] = useState<number | null>(null);

  useEffect(() => {
    const today = startOfDay(new Date());
    const days = Array.from({ length: DAYS }, (_, i) => subDays(today, DAYS - 1 - i));
    const index = new Map(days.map((d, i) => [d.getTime(), i]));
    const perDay = new Map(people.map((p) => [p.id, Array<number>(DAYS).fill(0)]));
    for (const it of items) {
      const i = index.get(startOfDay(new Date(it.at)).getTime());
      const row = perDay.get(it.o);
      if (i !== undefined && row) row[i] += it.p;
    }
    // Same order as the people given, so the legend never jumps around.
    const lines = people
      .map((p) => {
        let run = 0;
        return { id: p.id, name: p.name, color: p.color, totals: perDay.get(p.id)!.map((v) => (run += v)) };
      })
      .filter((l) => l.totals[DAYS - 1] > 0);
    setData({ labels: days.map((d) => format(d, "d MMM")), lines });
  }, [people, items]);

  const lines = data?.lines ?? [];
  const max = Math.max(1, ...lines.map((l) => l.totals[DAYS - 1]));
  const x = (i: number) => (i / (DAYS - 1)) * W;
  const y = (v: number) => H - 4 - (v / max) * (H - 16);
  const label = (l: { id: string; name: string }) => (l.id === meId ? `${l.name} (you)` : l.name);
  // Everyone else first, the viewer last so their line is on top.
  const drawn = [...lines.filter((l) => l.id !== meId), ...lines.filter((l) => l.id === meId)];

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
  // Who had any points by that day, most first.
  const atDay = day === null ? [] : lines.filter((l) => l.totals[day] > 0).sort((a, b) => b.totals[day] - a.totals[day]);

  return (
    <ChartCard className="game-race" title="The race, last 30 days" note="Points so far for each person, day by day">
      {data && lines.length === 0 ? (
        <ChartEmpty>Nobody has earned points in the last 30 days yet.</ChartEmpty>
      ) : (
        <>
          <div
            className="lines"
            tabIndex={0}
            aria-label="Points earned by each person, day by day. Use the left and right arrow keys to move between days."
            onPointerMove={point}
            onPointerDown={point}
            onPointerLeave={() => setDay(null)}
            onFocus={() => setDay((d) => d ?? DAYS - 1)}
            onBlur={() => setDay(null)}
            onKeyDown={step}
          >
            <span className="lines-max">{data ? max : " "}</span>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={lines.map((l) => `${label(l)}: ${l.totals[DAYS - 1]}`).join(", ")}>
              {[0.25, 0.5, 0.75].map((f) => (
                <line key={f} x1="0" x2={W} y1={y(max * f)} y2={y(max * f)} className="lines-grid" />
              ))}
              {drawn.map((l) => (
                <polyline
                  key={l.id}
                  points={l.totals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}
                  stroke={l.color}
                  className={l.id === meId ? "me" : undefined}
                />
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
                    <span className="tip-none">No points yet</span>
                  ) : (
                    <dl>
                      {atDay.map((l) => (
                        <div key={l.id} style={{ display: "contents" }}>
                          <i style={{ "--c": l.color } as CSSProperties} />
                          <dt>{label(l)}</dt>
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
          <Legend items={lines.map((l) => ({ label: label(l), color: l.color, value: l.totals[DAYS - 1] }))} />
        </>
      )}
    </ChartCard>
  );
}
