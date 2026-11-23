import type { CSSProperties } from "react";
import { pct } from "@/components/charts";
import { Avatar, Empty } from "@/components/ui";
import type { Level, Move } from "@/lib/game";
import { StampCountCell, StreakCell } from "./GameData";
import { MoveMark } from "./MoveMark";
import { PlaceMark } from "./PlaceMark";

export type RankRow = {
  id: string;
  name: string;
  admin: boolean;
  position: number;
  points: number;
  sent: number;
  opened: number;
  linkClicks: number;
  level: Level;
  move: Move;
};

/**
 * The ranking: one row per person, most points first. Ties share a place.
 * The top three wear a drawn medal (gold, silver, bronze), everyone else a plain numeral, so the place column lines up.
 * Each person's points have a bar: the leader's in gold, everyone else's in blue.
 * The viewer's own row has a soft blue tint and a small "you" label. On a phone, the secondary numbers fold into a line under the name.
 */
export function Ranking({
  rows,
  meId,
  periodLabel,
  showMoves,
  alone,
}: {
  rows: RankRow[];
  meId: string;
  periodLabel: string;
  showMoves: boolean;
  alone: boolean;
}) {
  const top = Math.max(1, ...rows.map((r) => r.points));
  const anyPoints = rows.some((r) => r.points > 0);

  return (
    <section className="card" aria-labelledby="rank-title">
      <div className="card-head">
        <h2 id="rank-title">Ranking</h2>
        <span className="aside">{anyPoints ? `${periodLabel}${showMoves ? ", change against the period before" : ""}` : periodLabel}</span>
      </div>
      {!anyPoints ? (
        <Empty small title="No points yet in this period">
          Nobody has sent a tracked email {periodLabel.toLowerCase()}. The first one sent puts its sender at the top.
        </Empty>
      ) : (
        <div className="table-wrap">
          <table className="game-table gb-table" data-moves={showMoves ? "" : undefined}>
            <thead>
              <tr>
                <th className="game-pos-h">
                  <span className="sr-only">Place</span>
                </th>
                <th>Person</th>
                <th className="game-points-h">Points</th>
                <th className="r hide-game">Sent</th>
                <th className="r hide-game">Opened</th>
                <th className="r hide-game">Link clicks</th>
                <th className="r hide-game">Streak</th>
                <th className="r hide-game">Stamps</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const me = r.id === meId;
                const none = r.points === 0;
                const lead = !none && r.points === top;
                const cls = [me && "me", r.position <= 3 && !none && "podium", none && "gb-zero"].filter(Boolean).join(" ");
                return (
                  <tr key={r.id} className={cls || undefined} aria-current={me ? "true" : undefined}>
                    <td className="game-pos">
                      <span className="gb-pos">
                        <PlaceMark place={r.position} none={none} />
                        {showMoves && (
                          <span className="gb-move-slot">
                            <MoveMark move={r.move} />
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="game-person">
                      <span className="game-who">
                        <Avatar name={r.name} admin={r.admin} />
                        <span>
                          <span className="gb-name">
                            <b title={r.name}>{r.name}</b>
                            {me && (
                              <span className="gb-you">
                                <span className="sr-only">(</span>you<span className="sr-only">)</span>
                              </span>
                            )}
                          </span>
                          <span className="game-who-sub gb-sub">
                            <span className="gb-lv">Level {r.level.level}</span>
                            <span className="show-game">{r.sent ? `${r.sent} sent · ${pct(r.opened, r.sent)} opened` : "nothing sent yet"}</span>
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="game-points gb-points">
                      <span className="gb-pts num">{r.points}</span>
                      <span className="gb-bar" aria-hidden="true">
                        {r.points > 0 && <span className={lead ? "gb-fill gb-lead" : "gb-fill"} style={{ width: `${(r.points / top) * 100}%` } as CSSProperties} />}
                      </span>
                    </td>
                    <td className="r num hide-game">{r.sent || <span className="faint">—</span>}</td>
                    <td className="r num hide-game">
                      {r.sent ? (
                        <span className="gb-split">
                          <span>{r.opened}</span>
                          <span className="faint">{pct(r.opened, r.sent)}</span>
                        </span>
                      ) : (
                        <span className="faint">—</span>
                      )}
                    </td>
                    <td className="r num hide-game">{r.linkClicks || <span className="faint">—</span>}</td>
                    <td className="r num hide-game">
                      <StreakCell id={r.id} />
                    </td>
                    <td className="r num hide-game">
                      <StampCountCell id={r.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {alone && <p className="quiet-note">It&apos;s just you so far. The board fills up as teammates join.</p>}
    </section>
  );
}
