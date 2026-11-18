"use client";

/** Shows a time in the viewer's own timezone: "Today, 10:42", "Yesterday, 18:03", "12 Nov, 09:15". */
export function When({ at, fallback = "—" }: { at: string | null; fallback?: string }) {
  if (!at) return <span className="faint">{fallback}</span>;
  const d = new Date(at);
  const now = new Date();
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  let label: string;
  if (days === 0) label = `Today, ${time}`;
  else if (days === 1) label = `Yesterday, ${time}`;
  else
    label = `${d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
    })}, ${time}`;
  return (
    <time dateTime={at} title={d.toLocaleString()} suppressHydrationWarning>
      {label}
    </time>
  );
}
