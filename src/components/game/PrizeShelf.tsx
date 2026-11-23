import { PRIZES, LevelPrize, hueStyle, prizeFor, type PrizeState } from "./LevelPrize";
import type { Level } from "@/lib/game";

const fmt = (n: number) => n.toLocaleString("en-US");

/**
 * Every prize in one tidy grid: the ones you have won in colour with their name, the next one with how far it is to go,
 * and the rest as grey outlines that say only their level. Past Level 12 all twelve are won and your own prize
 * (the set again, with a laurel) is added at the end.
 * It has no card round it: put it in one.
 */
export function PrizeShelf({ level }: { level: Level }) {
  const n = level.level;
  const shown = PRIZES.map((p) => p.level);
  if (n > PRIZES.length) shown.push(n);
  const won = Math.min(n, PRIZES.length);

  return (
    <div className="lv-shelf-wrap">
      <ol className="lv-shelf" aria-label={`Prizes: ${won} of ${PRIZES.length} won`}>
        {shown.map((l) => {
          const prize = prizeFor(l);
          const state: PrizeState = l < n ? "passed" : l === n ? "reached" : l === n + 1 ? "next" : "later";
          const hidden = state === "later";
          return (
            <li key={l} className={`lv-shelf-item ${state}`} style={hueStyle(prize.hue)} aria-current={state === "reached" ? "step" : undefined}>
              <span className="lv-shelf-art">
                <LevelPrize level={l} state={state} size="xl" decorative />
              </span>
              <span className="lv-shelf-text">
                {!hidden && <span className="lv-shelf-name">{prize.title}</span>}
                <span className="lv-shelf-sub">Level {l}</span>
                {state === "reached" && <span className="lv-shelf-here">Your level</span>}
                {state === "next" && <span className="lv-shelf-next">Next · {fmt(level.toGo)} {level.toGo === 1 ? "point" : "points"} to go</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
