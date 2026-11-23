import type { Level } from "@/lib/game";
import { LevelMark } from "./LevelMark";
import { hueStyle, prizeFor } from "./LevelPrize";

/** 5200 → "5,200". A fixed locale, so the server and the browser always agree. */
const fmt = (n: number) => n.toLocaleString("en-US");
const points = (n: number) => `${fmt(n)} ${n === 1 ? "point" : "points"}`;

/**
 * Progress from the level you are on to the next one: a prize at each end, the bar running between them.
 * The bar is in the colour of the prize you are on, and the next prize is shown as a dashed outline.
 * The full size also names the points where each level starts, under its prize, and says where you stand.
 * `compact` is for narrow cells (it fits in about 150px). `total` is your points; without it, it is worked out.
 */
export function LevelBar({ level, compact = false, total }: { level: Level; compact?: boolean; total?: number }) {
  const have = total ?? level.to - level.toGo;
  const next = level.level + 1;
  const done = Math.min(1, Math.max(0, level.progress));
  const size = compact ? "sm" : "md";
  const ends = [fmt(level.from), fmt(level.to)];

  return (
    <span className={`lv-bar${compact ? " compact" : ""}`} style={hueStyle(prizeFor(level.level).hue)}>
      <span
        className="lv-line"
        role="progressbar"
        aria-label={`Progress from Level ${level.level} to Level ${next}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.floor(done * 100)}
        aria-valuetext={`${points(level.toGo)} to Level ${next}`}
      >
        <LevelMark level={level.level} state="reached" size={size} decorative />
        <span className="lv-track">
          {done > 0 && <span className="lv-fill" style={{ width: `${(done * 100).toFixed(2)}%` }} />}
        </span>
        <LevelMark level={next} state="next" size={size} decorative />
      </span>
      {!compact && (
        <span className="lv-ends num" aria-hidden="true">
          {ends.map((e, i) => (
            <span key={i} className={`lv-end${e.length >= 5 ? " long" : ""}`}>
              {e}
            </span>
          ))}
        </span>
      )}
      <span className="lv-cap num">
        {compact ? (
          `${points(level.toGo)} to Level ${next}`
        ) : (
          <>
            <b>{points(have)}</b> · {fmt(level.toGo)} to Level {next}
          </>
        )}
      </span>
    </span>
  );
}
