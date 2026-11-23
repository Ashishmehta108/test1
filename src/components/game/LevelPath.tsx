import type { CSSProperties } from "react";
import { levelStart, type Level } from "@/lib/game";
import type { LevelMarkState } from "./LevelMark";
import { LevelPrize, PRIZE_PX, hueStyle, prizeFor } from "./LevelPrize";

const fmt = (n: number) => n.toLocaleString("en-US");

type Stop = { n: number; state: LevelMarkState; size: "lg" | "xl" };

/**
 * A short path of levels around yours: the prize just behind you, the one you are on, the next, and the one after.
 * On Level 1 nothing is behind you, so two later levels follow instead (there are always four).
 * Each prize has its name under it. The line between stops is solid (in the colour of your prize) where you have been,
 * part-filled towards the next level, and dashed beyond.
 * `total` is only used to say where you stand; without it, it is worked out.
 */
export function LevelPath({ level, total }: { level: Level; total?: number }) {
  const n = level.level;
  const have = total ?? level.to - level.toGo;
  const done = Math.min(1, Math.max(0, level.progress));
  const pct = (done * 100).toFixed(2);

  const stops: Stop[] =
    n === 1
      ? [
          { n: 1, state: "reached", size: "xl" },
          { n: 2, state: "next", size: "lg" },
          { n: 3, state: "later", size: "lg" },
          { n: 4, state: "later", size: "lg" },
        ]
      : [
          { n: n - 1, state: "passed", size: "lg" },
          { n, state: "reached", size: "xl" },
          { n: n + 1, state: "next", size: "lg" },
          { n: n + 2, state: "later", size: "lg" },
        ];

  return (
    <ol
      className="lv-path"
      style={{ "--cur": `var(--g-${prizeFor(n).hue})` } as CSSProperties}
      aria-label={`Levels around yours: you have ${fmt(have)} ${have === 1 ? "point" : "points"}`}
    >
      {stops.map((s, i) => {
        const after = stops[i + 1];
        const prize = prizeFor(s.n);
        return (
          <li key={s.n} className={`lv-stop ${s.state}`} style={hueStyle(prize.hue)} aria-current={s.state === "reached" ? "step" : undefined}>
            <span className="lv-stop-art">
              <LevelPrize level={s.n} state={s.state} size={s.size} decorative />
            </span>
            <span className="lv-stop-text">
              <span className="sr-only">Level {s.n}: </span>
              <span className="lv-stop-name">{prize.title}</span>
              <span className="lv-stop-sub">
                {s.state === "reached" ? (
                  "You are here"
                ) : s.state === "next" ? (
                  <>
                    {fmt(level.toGo)}
                    <span className="lv-unit"> {level.toGo === 1 ? "point" : "points"}</span> to go
                  </>
                ) : (
                  `Level ${s.n}`
                )}
              </span>
              <span className="lv-stop-pts num">
                {fmt(levelStart(s.n))}
                <span className="lv-unit"> points</span>
              </span>
            </span>
            {after && (
              <span
                className={`lv-conn ${s.state === "passed" ? "done" : s.state === "reached" ? "toward" : "ahead"}`}
                style={{ "--a": `${PRIZE_PX[s.size] / 2}px`, "--b": `${PRIZE_PX[after.size] / 2}px` } as CSSProperties}
                aria-hidden="true"
              >
                {s.state === "reached" ? (
                  <>
                    {done > 0 && <i className="lv-conn-fill" style={{ width: `${pct}%` }} />}
                    <i className="lv-conn-rest" style={{ left: `${pct}%` }} />
                  </>
                ) : (
                  <i className="lv-conn-rest" />
                )}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
