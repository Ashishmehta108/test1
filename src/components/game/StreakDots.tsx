import { format } from "date-fns";

type Day = { key: string; date: Date; sent: boolean };

/**
 * One day's square, drawn as a rect so the dashed outline of a missed day has even dashes.
 * `s` is the side in pixels; the rect is inset by half its stroke so the outline stays crisp.
 */
function Square({ s, sent }: { s: number; sent: boolean }) {
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden="true" focusable="false">
      <rect className={sent ? "gb-sq-on" : "gb-sq-off"} x="0.625" y="0.625" width={s - 1.25} height={s - 1.25} rx="3" pathLength={32} />
    </svg>
  );
}

/**
 * The last ten working days, oldest first, as two groups of five (the earlier five, then the latest five).
 * A day with a tracked email is a solid orange square (the warmth of a streak); a day without one is a grey dashed outline ("not yet").
 * The last square, the latest working day, wears a thin ring. With `labels`, a weekday initial sits under each square.
 */
export function StreakDots({ days, labels = false }: { days: Day[]; labels?: boolean }) {
  const s = labels ? 18 : 11;
  const split = Math.max(0, days.length - 5);
  const groups = [days.slice(0, split), days.slice(split)].filter((g) => g.length > 0);
  const sentCount = days.filter((d) => d.sent).length;
  let at = 0;
  return (
    <span className={`gb-days${labels ? " gb-days-labelled" : ""}`} role="img" aria-label={`Working days with a tracked email sent, last two weeks: ${sentCount} of ${days.length}`}>
      {groups.map((g, gi) => (
        <span key={gi} className="gb-days-group">
          {g.map((d) => {
            const i = at++;
            const last = i === days.length - 1;
            const tip = i < 3 ? " tip-left" : i > days.length - 4 ? " tip-right" : "";
            return (
              <span key={d.key} className={`gb-day${d.sent ? " gb-day-on" : ""}${last ? " gb-day-last" : ""}`}>
                <span className={`gb-sq${tip}`} data-tip={`${format(d.date, "EEE d MMM")} · ${d.sent ? "sent" : "nothing sent"}`}>
                  <Square s={s} sent={d.sent} />
                </span>
                {labels && (
                  <span className="gb-ini" aria-hidden="true">
                    {format(d.date, "EEEEE")}
                  </span>
                )}
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}
