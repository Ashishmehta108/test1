import { POINTS_OPENED, POINTS_SENT, type Level } from "@/lib/game";
import { LevelPath } from "./LevelPath";
import { LevelPrize, hueStyle, prizeFor } from "./LevelPrize";

const fmt = (n: number) => n.toLocaleString("en-US");
/** One tracked email that gets opened is worth this many points: 1 for sending it and 3 more for the open. */
const PER_OPENED_EMAIL = POINTS_SENT + POINTS_OPENED;

/**
 * "Your level" for the leaderboard: the prize you hold as a headline ("Level 4 · Compass", on a wash of its colour),
 * the path of levels around it, and one plain line on what it takes to reach the next.
 * `name` is only read out for screen readers, so the card says whose it is.
 */
export function LevelCard({ level, total, name }: { level: Level; total?: number; name?: string }) {
  const have = total ?? level.to - level.toGo;
  const opens = Math.max(1, Math.ceil(level.toGo / PER_OPENED_EMAIL));
  const prize = prizeFor(level.level);

  return (
    <section className="card lv-card">
      <div className="card-head">
        <h2>
          Your level
          {name && <span className="sr-only"> ({name})</span>}
        </h2>
        <span className="aside">All time</span>
      </div>
      <div className="lv-card-body">
        <div className="lv-card-top" style={hueStyle(prize.hue)}>
          <LevelPrize level={level.level} state="reached" size="xl" decorative />
          <div className="lv-card-text">
            <p className="lv-card-title">
              Level {level.level} · <span>{prize.title}</span>
            </p>
            <p className="lv-card-sub num">
              {fmt(have)} {have === 1 ? "point" : "points"} all time
            </p>
          </div>
        </div>
        <LevelPath level={level} total={have} />
      </div>
      <p className="quiet-note num">
        {fmt(level.toGo)} more {level.toGo === 1 ? "point" : "points"} to reach Level {level.level + 1}.{" "}
        {opens === 1 ? "One opened email will do it." : `That is about ${opens} opened emails.`}
      </p>
    </section>
  );
}
