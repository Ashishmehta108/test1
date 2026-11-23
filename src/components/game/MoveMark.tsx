import type { Move } from "@/lib/game";

const places = (n: number) => (n === 1 ? "1 place" : `${n} places`);

/** A small solid triangle, drawn on a 12 grid with softly rounded corners so it sits at the weight of the number beside it. */
function Triangle({ down = false }: { down?: boolean }) {
  return (
    <svg className="gb-tri" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d={down ? "M2.4 3.9h7.2L6 9.6z" : "M6 2.4l3.6 5.7H2.4z"} />
    </svg>
  );
}

/**
 * How someone moved against the period before. Up and down are small soft chips: a triangle and the number of places,
 * green for up and coral for down. The same is a short grey dash, someone just arrived gets a small "New" label,
 * and someone with no points gets nothing. The words are always there for screen readers, and the triangle's
 * direction carries the meaning as well as the colour.
 */
export function MoveMark({ move }: { move: Move }) {
  switch (move.kind) {
    case "none":
      return null;
    case "up":
    case "down": {
      const up = move.kind === "up";
      const words = `${up ? "Up" : "Down"} ${places(move.by)}`;
      return (
        <span className={`gb-move ${up ? "gb-up" : "gb-down"}`} data-tip={`${words} on the period before`}>
          <Triangle down={!up} />
          <span className="gb-move-n num" aria-hidden="true">
            {move.by}
          </span>
          <span className="sr-only">{words}</span>
        </span>
      );
    }
    case "same":
      return (
        <span className="gb-move gb-same" data-tip="Same place as the period before">
          <span className="gb-dash" aria-hidden="true" />
          <span className="sr-only">Same place</span>
        </span>
      );
    case "new":
      return (
        <span className="gb-move gb-new" data-tip="Not on the board in the period before">
          New
        </span>
      );
  }
}
