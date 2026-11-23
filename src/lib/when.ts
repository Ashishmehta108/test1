import { format, isSameYear, isToday, isYesterday } from "date-fns";

/*
 * Times are stored as exact moments (UTC). These run in the browser, so every formatting
 * call below uses the viewer's own timezone.
 */

/** "Today, 10:42", "Yesterday, 18:03", "12 Nov, 09:15", or "12 Nov 2025, 09:15" for another year. */
export function shortWhen(d: Date): string {
  const time = format(d, "HH:mm");
  if (isToday(d)) return `Today, ${time}`;
  if (isYesterday(d)) return `Yesterday, ${time}`;
  return `${format(d, isSameYear(d, new Date()) ? "d MMM" : "d MMM yyyy")}, ${time}`;
}

/** "12 Nov 2026, 09:15:42 (UTC+05:30)": the exact time, with the offset that applied at that moment. */
export function longWhen(d: Date): string {
  return `${format(d, "d MMM yyyy, HH:mm:ss")} (${offsetOf(d)})`;
}

/** "India Standard Time (UTC+05:30)": the viewer's timezone, named in plain words. */
export function zoneName(d: Date = new Date()): string {
  const name = new Intl.DateTimeFormat("en-US", { timeZoneName: "longGeneric" })
    .formatToParts(d)
    .find((p) => p.type === "timeZoneName")?.value;
  const offset = offsetOf(d);
  // Some zones have no everyday name ("GMT+00:00"); then the offset alone is clearer.
  if (!name || /^GMT/.test(name)) return offset === "UTC" ? "Coordinated Universal Time (UTC)" : offset;
  return `${name} (${offset})`;
}

function offsetOf(d: Date): string {
  const offset = format(d, "xxx");
  return offset === "+00:00" ? "UTC" : `UTC${offset}`;
}
