"use client";

import { addDays, differenceInCalendarDays, format, startOfDay, subDays } from "date-fns";
import { useEffect, useState, type CSSProperties } from "react";
import { ChartCard, ChartEmpty, Legend, OUTCOME } from "@/components/charts";

const MAX_DAYS = 30;
type Day = { label: string; opens: number; clicks: number };

/**
 * Opens and link clicks per day, from the day the email was sent until today (at most the
 * last 30 days). Days are the viewer's own days, so this is worked out in the browser.
 * Pointing at a day shows a small box with that day's numbers.
 */
export function OpensChart({ sentAt, opens, clicks }: { sentAt: string; opens: string[]; clicks: string[] }) {
  const [days, setDays] = useState<Day[] | null>(null);
  const [on, setOn] = useState<number | null>(null);

  useEffect(() => {
    const today = startOfDay(new Date());
    const sentDay = startOfDay(new Date(sentAt));
    const span = Math.min(MAX_DAYS, Math.max(1, differenceInCalendarDays(today, sentDay) + 1));
    const first = subDays(today, span - 1);
    const list = Array.from({ length: span }, (_, i) => {
      const d = addDays(first, i);
      return { key: d.getTime(), label: format(d, "d MMM"), opens: 0, clicks: 0 };
    });
    const at = new Map(list.map((d) => [d.key, d]));
    for (const t of opens) { const d = at.get(startOfDay(new Date(t)).getTime()); if (d) d.opens++; }
    for (const t of clicks) { const d = at.get(startOfDay(new Date(t)).getTime()); if (d) d.clicks++; }
    setDays(list);
  }, [sentAt, opens, clicks]);

  const totalOpens = days?.reduce((n, d) => n + d.opens, 0) ?? 0;
  const totalClicks = days?.reduce((n, d) => n + d.clicks, 0) ?? 0;
  const max = Math.max(1, ...(days ?? []).map((d) => Math.max(d.opens, d.clicks)));
  const capped = days?.length === MAX_DAYS;
  const active = on !== null && days ? days[on] : null;
  const n = days?.length ?? 1;

  return (
    <ChartCard
      title="Opens over time"
      note={capped ? "Each day of the last 30 days" : "Each day since it was sent"}
      aside={
        <Legend
          items={[
            { label: "Opened", color: OUTCOME.opened.color, value: days ? totalOpens : undefined },
            { label: "Clicked a link", color: OUTCOME.clicked.color, value: days ? totalClicks : undefined },
          ]}
        />
      }
    >
      {days && totalOpens + totalClicks === 0 ? (
        <ChartEmpty>No opens or clicks in the last 30 days.</ChartEmpty>
      ) : (
        <div className="day-chart">
          <div
            className="day-bars"
            style={{ "--n": n } as CSSProperties}
            role="img"
            aria-label={`${totalOpens} opens and ${totalClicks} link clicks, by day`}
            onPointerLeave={() => setOn(null)}
          >
            {(days ?? []).map((d, i) => (
              <div key={d.label} className={on === i ? "day on" : "day"} onPointerEnter={() => setOn(i)}>
                <i className="o" style={{ height: d.opens ? `${Math.max(4, (d.opens / max) * 100)}%` : 0 }} />
                <i className="c" style={{ height: d.clicks ? `${Math.max(4, (d.clicks / max) * 100)}%` : 0 }} />
              </div>
            ))}
            {active && on !== null && (
              <div
                className={`chart-tip ${on > n / 2 ? "left" : "right"}`}
                style={{ left: `${((on + (on > n / 2 ? 0 : 1)) / n) * 100}%` }}
                aria-hidden="true"
              >
                <span className="tip-title">{active.label}</span>
                <dl>
                  <i style={{ "--c": OUTCOME.opened.color } as CSSProperties} />
                  <dt>Opened</dt>
                  <dd>{active.opens}</dd>
                  <i style={{ "--c": OUTCOME.clicked.color } as CSSProperties} />
                  <dt>Clicked a link</dt>
                  <dd>{active.clicks}</dd>
                </dl>
              </div>
            )}
          </div>
          <div className="chart-axis" aria-hidden="true">
            <span>{days && n > 1 ? days[0].label : " "}</span>
            <span>{days ? "Today" : " "}</span>
          </div>
        </div>
      )}
    </ChartCard>
  );
}
