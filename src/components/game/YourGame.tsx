"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { TrackButton } from "@/components/TrackEmail";
import { POINTS_CLICKED, POINTS_OPENED, POINTS_SENT, STAMPS, ordinal, type Level } from "@/lib/game";
import type { ServerFacts } from "./GameData";
import { LevelBar } from "./LevelBar";
import { Seal } from "./Seal";
import { stampHue } from "./StampArt";
import { StreakDots } from "./StreakDots";
import { useMyGame } from "./useMyGame";

const daysWord = (n: number) => (n === 1 ? "1 day" : `${n} days`);

/**
 * "Your game" on a person's own Results page: place on the board, points, level, streak and the next stamp,
 * in one card split by hairlines. The streak and the next stamp are worked out in the browser (the viewer's own days).
 */
export function YourGame({
  place,
  level,
  facts,
  times,
}: {
  place: { position: number; of: number; points: number; toNext: number | null };
  level: Level;
  facts: ServerFacts;
  times: string[];
}) {
  const game = useMyGame(facts, times);

  if (facts.sent === 0) {
    return (
      <section className="card game-mine game-first" aria-labelledby="your-game-title">
        <Seal mark="1st" />
        <span className="game-first-text">
          <b id="your-game-title">Track an email to earn your first point</b>
          <span>
            Every tracked email you send earns {POINTS_SENT} point, {POINTS_OPENED} more when it is opened and {POINTS_CLICKED} more when a link in it is clicked.
          </span>
        </span>
        <span className="game-first-act">
          <TrackButton className="btn btn-sm">Track an email</TrackButton>
          <Link href="/leaderboard" className="btn btn-sm btn-quiet">
            See the leaderboard
          </Link>
        </span>
      </section>
    );
  }

  const onBoard = place.points > 0;
  const next = game?.next[0];

  return (
    <section className="card game-mine" aria-labelledby="your-game-title">
      <div className="card-head">
        <h2 id="your-game-title">Your game</h2>
        <Link href="/leaderboard" className="game-mine-link">
          See the leaderboard
        </Link>
      </div>
      <div className="game-strip">
        <div className="stat">
          <span className="l">Place on the board</span>
          <span className="v">{onBoard ? ordinal(place.position) : "—"}</span>
          <span className="sub">{!onBoard
              ? "Send an email to get on the board"
              : place.toNext
                ? `of ${place.of} · ${place.toNext} ${place.toNext === 1 ? "point" : "points"} to move up`
                : `of ${place.of}, last 30 days`}</span>
        </div>
        <div className="stat">
          <span className="l">Points</span>
          <span className="v num">{place.points}</span>
          <span className="sub">in the last 30 days</span>
        </div>
        <div className="stat">
          <span className="l">Level</span>
          <span className="v">Level {level.level}</span>
          <span className="sub">
            <LevelBar level={level} compact />
          </span>
        </div>
        <div className="stat">
          <span className="l">Streak</span>
          <span className="v">{game ? daysWord(game.streak) : " "}</span>
          <span className="sub">
            {game && <StreakDots days={game.recent} />}
          </span>
        </div>
        <div className="stat game-next-cell">
          <span className="l">Next stamp</span>
          {!game ? (
            <span className="game-next-body"> </span>
          ) : next ? (
            <span className="game-next-body">
              <Seal id={next.stamp.id} mark={next.stamp.mark} progress={next.have / next.need} />
              <span className="game-next-text">
                <b>{next.stamp.name}</b>
                {next.need > 1 ? (
                  <span className="game-progress-line">
                    <span className="game-bar" aria-hidden="true" style={{ "--bar": `var(--g-${stampHue(next.stamp.id)})`, "--bar-wash": `var(--g-${stampHue(next.stamp.id)}-wash)` } as CSSProperties}>
                      <span style={{ width: `${(next.have / next.need) * 100}%` }} />
                    </span>
                    <span className="num">
                      {next.have} of {next.need}
                      {next.unit ? ` ${next.unit}` : ""}
                    </span>
                  </span>
                ) : (
                  <span className="game-next-how">{next.stamp.how}</span>
                )}
              </span>
            </span>
          ) : (
            <span className="game-next-body">
              <span className="game-next-text">
                <b>All {STAMPS.length} stamps earned</b>
              </span>
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
