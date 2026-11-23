import { ordinal } from "@/lib/game";

type Size = "sm" | "md" | "lg";

const METAL = ["", "gold", "silver", "bronze"] as const;

/** One of the two ribbon tails behind a medal: a strip with a swallow-tail end, leaning outwards from the top. */
const TAIL = "M-3.4 0H3.4V13.6L0 10.8L-3.4 13.6Z";

/**
 * The mark for a place on the board. 1st, 2nd and 3rd are a small drawn medal: a round face with a rim in the metal
 * (gold, silver or bronze) and two ribbon tails hanging below it, with the numeral on the face.
 * 4th and below are a quiet numeral in the same box, so a column of marks lines up.
 * `none` is for someone with no points in the period: a dash.
 */
export function PlaceMark({ place, size = "md", none = false }: { place: number; size?: Size; none?: boolean }) {
  if (none) {
    return (
      <span className={`gb-place gb-place-${size} gb-place-none`} role="img" aria-label="No place yet">
        <span aria-hidden="true" className="gb-place-n">
          —
        </span>
      </span>
    );
  }
  const medal = place >= 1 && place <= 3;
  return (
    <span className={`gb-place gb-place-${size}${medal ? ` gb-medal gb-${METAL[place]}` : ""}`} role="img" aria-label={`${ordinal(place)} place`}>
      {medal && (
        <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
          <path className="gb-m-tail" transform="translate(12.2 22.4) rotate(16)" d={TAIL} />
          <path className="gb-m-tail" transform="translate(19.8 22.4) rotate(-16)" d={TAIL} />
          <circle className="gb-m-rim" cx="16" cy="16" r="12.8" />
          <circle className="gb-m-face" cx="16" cy="16" r="9.9" />
        </svg>
      )}
      <span aria-hidden="true" className="gb-place-n">
        {place}
      </span>
    </span>
  );
}
