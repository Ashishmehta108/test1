"use client";

import { useEffect, useState } from "react";
import { ChartCard, ChartEmpty, ChartFoot, HeatKey, Heatmap } from "@/components/charts";

const DAY_PLURALS = ["Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays", "Sundays"];
const two = (n: number) => String(n).padStart(2, "0");
const hourName = (h: number) => `${two(h)}:00 to ${two((h + 1) % 24)}:00`;
/** Below this many opens, naming a "busiest" time would be guesswork. */
const ENOUGH = 5;

type Busy = { slotDay: number; slotHour: number; day: number; hour: number };

/**
 * When people open: one square per weekday and hour, plus a line naming the busiest times in words.
 * Days and hours are the viewer's own, so all of it is worked out in the browser.
 */
export function BusyTimes({ opens }: { opens: string[] }) {
  const [busy, setBusy] = useState<Busy | null>(null);

  useEffect(() => {
    const grid = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
    const days = Array<number>(7).fill(0);
    const hours = Array<number>(24).fill(0);
    for (const iso of opens) {
      const d = new Date(iso);
      const day = (d.getDay() + 6) % 7;
      grid[day][d.getHours()]++;
      days[day]++;
      hours[d.getHours()]++;
    }
    let slotDay = 0;
    let slotHour = 0;
    grid.forEach((row, d) => row.forEach((v, h) => { if (v > grid[slotDay][slotHour]) { slotDay = d; slotHour = h; } }));
    setBusy({ slotDay, slotHour, day: days.indexOf(Math.max(...days)), hour: hours.indexOf(Math.max(...hours)) });
  }, [opens]);

  return (
    <ChartCard title="When people open" note="Each square is one hour of one weekday, in your own time" aside={opens.length ? <HeatKey /> : undefined}>
      {opens.length === 0 ? (
        <ChartEmpty>No opens in the last 30 days yet, so there is no pattern to show.</ChartEmpty>
      ) : (
        <>
          <Heatmap times={opens} />
          <ChartFoot>
            {!busy ? (
              " "
            ) : opens.length < ENOUGH ? (
              <>Only {opens.length} {opens.length === 1 ? "open" : "opens"} so far, too few to name a busiest time.</>
            ) : (
              <>
                Busiest hour of the week: <b>{DAY_PLURALS[busy.slotDay]}, {hourName(busy.slotHour)}</b>. Across all days, most opens come on{" "}
                <b>{DAY_PLURALS[busy.day]}</b> and between <b>{hourName(busy.hour).replace(" to ", " and ")}</b>.
              </>
            )}
          </ChartFoot>
        </>
      )}
    </ChartCard>
  );
}
