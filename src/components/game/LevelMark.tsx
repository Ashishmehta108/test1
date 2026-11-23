import { LevelPrize } from "./LevelPrize";

export type LevelMarkState = "reached" | "passed" | "next" | "later";
export type LevelMarkSize = "sm" | "md" | "lg";

/**
 * One level, as its prize (see LevelPrize.tsx).
 *  reached: the level you are on (full colour)
 *  passed:  a level behind you (full colour, you won it)
 *  next:    the level you are heading to (its prize as a dashed outline in its colour)
 *  later:   further on still (a dashed grey outline)
 * Small (`sm`) carries the level number on it; `md` and `lg` show the drawing alone, so set `decorative` when the words
 * beside it already name the level. For the largest size and a number on every size, use LevelPrize directly.
 */
export function LevelMark({
  level,
  state = "reached",
  size = "md",
  decorative = false,
}: {
  level: number;
  state?: LevelMarkState;
  size?: LevelMarkSize;
  decorative?: boolean;
}) {
  return <LevelPrize level={level} state={state} size={size} decorative={decorative} />;
}
