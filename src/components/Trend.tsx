"use client";

import { format, startOfDay, subDays } from "date-fns";
import { useEffect, useState } from "react";
import { ChartCard, ChartEmpty, Legend, OUTCOME } from "./charts";

const DAYS = 30;
type Day = { label: string; sent: number; opened: number };

/**
 * Emails sent per day for the last 30 days, with the part that got opened in green.
 * Days are the viewer's own days, so it is worked out in the browser.
 */
export function Trend({
  sent,
  opened,
  title = "Last 30 days",
  note = "Emails sent each day, and how many of them were opened",
}: {
  sent: string[];
  opened: string[];
  title?: string;
  note?: string;
}) {
  const [days, setDays] = useState<Day[] | null>(null);

  useEffect(() => {
    const today = startOfDay(new Date());
    const list = Array.from({ length: DAYS }, (_, i) => {
      const d = subDays(today, DAYS - 1 - i);
      return { key: d.getTime(), label: format(d, "d MMM"), sent: 0, opened: 0 };
    });
    const at = new Map(list.map((d) => [d.key, d]));
    for (const iso of sent) { const d = at.get(startOfDay(new Date(iso)).getTime()); if (d) d.sent++; }
    for (const iso of opened) { const d = at.get(startOfDay(new Date(iso)).getTime()); if (d) d.opened++; }
    setDays(list);
  }, [sent, opened]);

  const totalSent = days?.reduce((n, d) => n + d.sent, 0) ?? 0;
  const totalOpened = days?.reduce((n, d) => n + d.opened, 0) ?? 0;
  const max = Math.max(1, ...(days?.map((d) => d.sent) ?? [1]));

  return (
    <ChartCard
      title={title}
      note={note}
      aside={
        <Legend
          items={[
            { label: "Sent", color: OUTCOME.waiting.color, value: days ? totalSent : undefined },
            { label: "Opened", color: OUTCOME.opened.color, value: days ? totalOpened : undefined },
          ]}
        />
      }
    >
      {days && totalSent === 0 ? (
        <ChartEmpty>No emails sent in the last 30 days.</ChartEmpty>
      ) : (
        <>
          <div className="trend-bars" role="img" aria-label={`${totalSent} sent and ${totalOpened} opened in the last 30 days`}>
            {(days ?? []).map((d) => (
              <div className="trend-col" key={d.label} data-tip={`${d.label} · ${d.sent} sent, ${d.opened} opened`}>
                {d.sent > 0 && (
                  <div className="trend-sent" style={{ height: `${Math.max(4, (d.sent / max) * 100)}%` }}>
                    {d.opened > 0 && <div className="trend-open" style={{ height: `${(d.opened / d.sent) * 100}%` }} />}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="chart-axis" aria-hidden="true">
            <span>{days?.[0].label ?? " "}</span>
            <span>{days ? "Today" : " "}</span>
          </div>
        </>
      )}
    </ChartCard>
  );
}
