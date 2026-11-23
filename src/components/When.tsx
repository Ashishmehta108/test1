"use client";

import { useEffect, useState } from "react";
import { longWhen, shortWhen, zoneName } from "@/lib/when";

/**
 * Shows a time in the viewer's own timezone: "Today, 10:42", "Yesterday, 18:03", "12 Nov, 09:15".
 * The server doesn't know the viewer's timezone, so the text is only filled in once the
 * page is in the browser. Otherwise the server's time (UTC) would stick. Hovering shows the
 * exact time and the timezone.
 */
export function When({ at, fallback = "—" }: { at: string | null; fallback?: string }) {
  const [text, setText] = useState<{ short: string; full: string } | null>(null);

  useEffect(() => {
    if (!at) return;
    const d = new Date(at);
    setText({ short: shortWhen(d), full: longWhen(d) });
  }, [at]);

  if (!at) return <span className="faint">{fallback}</span>;
  return (
    <time dateTime={at} data-tip={text?.full}>
      {text?.short ?? " "}
    </time>
  );
}

/** One quiet line that says which timezone the times on the page are shown in. */
export function TimeZoneNote({ className = "small faint" }: { className?: string }) {
  const [name, setName] = useState("");
  useEffect(() => setName(zoneName()), []);
  return <p className={className}>{name ? `Times are shown in ${name}.` : " "}</p>;
}
