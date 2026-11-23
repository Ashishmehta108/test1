"use client";

import { useEffect, useState } from "react";
import { ChartCard, ChartEmpty, ChartFoot, Columns } from "./charts";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_PLURALS = ["Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays", "Sundays"];
const two = (n: number) => String(n).padStart(2, "0");
const opens = (v: number) => `${v} ${v === 1 ? "open" : "opens"}`;

/**
 * When people open: by hour of the day and by day of the week.
 * Hours and days are the viewer's own, so this is worked out in the browser.
 */
export function OpenTimes({ opens: times }: { opens: string[] }) {
  const [data, setData] = useState<{ hours: number[]; days: number[] } | null>(null);

  useEffect(() => {
    const hours = Array<number>(24).fill(0);
    const days = Array<number>(7).fill(0);
    for (const iso of times) {
      const d = new Date(iso);
      hours[d.getHours()]++;
      days[(d.getDay() + 6) % 7]++;
    }
    setData({ hours, days });
  }, [times]);

  const hours = data?.hours ?? Array<number>(24).fill(0);
  const days = data?.days ?? Array<number>(7).fill(0);
  const busiestHour = hours.indexOf(Math.max(...hours));
  const busiestDay = days.indexOf(Math.max(...days));
  const any = times.length > 0;
  const hourName = (h: number) => `${two(h)}:00 to ${two((h + 1) % 24)}:00`;

  return (
    <>
      <ChartCard title="Time of day people open">
        {any ? (
          <>
            <Columns
              label="Opens by hour of the day"
              values={hours}
              labels={hours.map((_, h) => (h % 6 === 0 ? two(h) : null))}
              tips={hours.map((v, h) => `${hourName(h)} · ${opens(v)}`)}
            />
            <ChartFoot>{data ? <>Busiest hour: <b>{hourName(busiestHour)}</b>, in your own time.</> : " "}</ChartFoot>
          </>
        ) : (
          <ChartEmpty>No opens in the last 30 days yet.</ChartEmpty>
        )}
      </ChartCard>
      <ChartCard title="Day of the week">
        {any ? (
          <>
            <Columns label="Opens by day of the week" values={days} labels={DAY_NAMES} tips={days.map((v, d) => `${DAY_NAMES[d]} · ${opens(v)}`)} />
            <ChartFoot>{data ? <>Most opens happen on <b>{DAY_PLURALS[busiestDay]}</b>.</> : " "}</ChartFoot>
          </>
        ) : (
          <ChartEmpty>No opens in the last 30 days yet.</ChartEmpty>
        )}
      </ChartCard>
    </>
  );
}
