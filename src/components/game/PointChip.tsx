export type PointKind = "sent" | "opened" | "clicked";

/** Which step a number of points stands for: 1 is the send, 2 the click, 3 or 4 an open, 6 a click (and the open before it). */
function kindFor(points: number): PointKind {
  if (points >= 6 || points === 2) return "clicked";
  if (points >= 3) return "opened";
  return "sent";
}

/**
 * The small "+1", "+4", "+6" chip beside an email or one of its three steps.
 * Earned is a soft flat chip: neutral for the send, green for an open, sky blue for a click. Not yet is dashed and quiet.
 * Zero or less is a faint dash. Numerals are tabular and the chip has a minimum width, so a column of them lines up.
 * `kind` says which step it is; leave it out and it follows the number (+1 send, +3 or +4 open, +2 or +6 click).
 */
export function PointChip({ points, earned = true, size = "md", kind }: { points: number; earned?: boolean; size?: "sm" | "md"; kind?: PointKind }) {
  if (points <= 0) {
    return (
      <span className={`gb-chip gb-chip-${size} gb-chip-zero`}>
        <span aria-hidden="true">—</span>
        <span className="sr-only">No points</span>
      </span>
    );
  }
  return (
    <span className={`gb-chip gb-chip-${size} ${earned ? `gb-chip-on gb-k-${kind ?? kindFor(points)}` : "gb-chip-off"}`}>
      <span aria-hidden="true">+{points}</span>
      <span className="sr-only">
        {points === 1 ? "1 point" : `${points} points`}
        {earned ? "" : ", not yet"}
      </span>
    </span>
  );
}
