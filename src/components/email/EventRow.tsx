"use client";

import { useOptimistic } from "react";
import { ignoreEvent } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { When } from "@/components/When";

/**
 * One line in the Activity list. Pressing "That was me" greys the line out and shows
 * "Not counted" straight away; the saved result arrives a moment later from the server.
 */
export function EventRow({
  emailId,
  id,
  type,
  kind,
  what,
  at,
  detail,
}: {
  emailId: string;
  id: number;
  type: "open" | "click";
  /** The saved kind of event: "real", "maybe" or "ignored". */
  kind: string;
  /** The words for the line, e.g. "Opened" or "Clicked example.com". */
  what: string;
  at: string | null;
  /** The device or reason shown after the time. */
  detail: string;
}) {
  const [ignored, setIgnored] = useOptimistic(kind === "ignored");

  const rowKind = ignored ? "ignored" : kind;
  const dot = ignored ? "ignored" : kind === "maybe" ? "maybe" : type === "click" ? "click" : "real";

  return (
    <li className={`tl-item ${rowKind}`}>
      <span className={`tl-dot ${dot}`} aria-hidden="true" />
      <div className="tl-main">
        <b>
          {what}
          {ignored && <span className="pill">Not counted</span>}
        </b>
        <span>
          <When at={at} /> · {detail}
        </span>
      </div>
      {!ignored && (
        <form
          action={async () => {
            setIgnored(true);
            await ignoreEvent(emailId, type, id);
          }}
          className="inline-form"
        >
          <SubmitButton className="btn btn-sm me-btn" pendingText="Saving…" aria-label={`That was me: ${what}`}>
            That was me
          </SubmitButton>
        </form>
      )}
    </li>
  );
}
