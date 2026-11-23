"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { STAMPS, bestStreak, currentStreak, earnedCount, earnedStamps, recentWorkdays, sendDays, type StampFacts } from "@/lib/game";
import { Avatar } from "@/components/ui";
import { StampShelf } from "./StampShelf";
import { StreakDots } from "./StreakDots";

/** What the server knows about a person; the browser adds the streaks (they depend on the viewer's own days). */
export type ServerFacts = Omit<StampFacts, "bestStreak90">;
type Person = { id: string; name: string; admin: boolean };
type Worked = { streak: number; bestInPeriod: number; facts: StampFacts; stamps: number; recent: { key: string; date: Date; sent: boolean }[] };

const Ctx = createContext<Map<string, Worked> | null>(null);

/**
 * Works out everyone's streaks and stamps once, in the browser, from the send times of the last 90 days.
 * `span` is how many days back the "longest streak" leader looks (7, 30 or 90).
 */
export function GameData({
  people,
  facts,
  times,
  span,
  children,
}: {
  people: Person[];
  facts: Record<string, ServerFacts>;
  times: Record<string, string[]>;
  span: number;
  children: ReactNode;
}) {
  const [worked, setWorked] = useState<Map<string, Worked> | null>(null);
  useEffect(() => {
    const today = new Date();
    const m = new Map<string, Worked>();
    for (const p of people) {
      const days = sendDays(times[p.id] ?? []);
      const all: StampFacts = { ...facts[p.id], bestStreak90: bestStreak(days, 90, today) };
      m.set(p.id, {
        streak: currentStreak(days, today),
        bestInPeriod: bestStreak(days, span, today),
        facts: all,
        stamps: earnedCount(all),
        recent: recentWorkdays(days, 10, today),
      });
    }
    setWorked(m);
  }, [people, facts, times, span]);
  return <Ctx.Provider value={worked}>{children}</Ctx.Provider>;
}

function useWorked(id: string): Worked | null {
  return useContext(Ctx)?.get(id) ?? null;
}

const daysWord = (n: number) => (n === 1 ? "1 day" : `${n} days`);

/** A person's current streak, for the ranking. */
export function StreakCell({ id }: { id: string }) {
  const w = useWorked(id);
  if (!w) return <span> </span>;
  return w.streak ? <span>{daysWord(w.streak)}</span> : <span className="faint">—</span>;
}

/** How many stamps a person has, for the ranking. */
export function StampCountCell({ id }: { id: string }) {
  const w = useWorked(id);
  if (!w) return <span> </span>;
  return w.stamps ? <span data-tip={`${w.stamps} of ${STAMPS.length} stamps`} className="tip-right">{w.stamps}</span> : <span className="faint">—</span>;
}

/** The viewer's streak as a headline number, with their last 10 working days as small squares under it. */
export function StreakValue({ id }: { id: string }) {
  const w = useWorked(id);
  return <>{w ? daysWord(w.streak) : " "}</>;
}

export function StreakDays({ id }: { id: string }) {
  const w = useWorked(id);
  if (!w) return <span> </span>;
  return <StreakDots days={w.recent} />;
}

/** The "Longest streak" leader for the period, worked out in the browser. */
export function StreakLeader({ people, meId, spanLabel }: { people: Person[]; meId: string; spanLabel: string }) {
  const all = useContext(Ctx);
  if (!all) return <LeaderBody title="Longest streak" />;
  const best = Math.max(0, ...people.map((p) => all.get(p.id)?.bestInPeriod ?? 0));
  const who = best >= 2 ? people.filter((p) => all.get(p.id)?.bestInPeriod === best) : [];
  return (
    <LeaderBody
      title="Longest streak"
      rule={`Working days in a row with an email sent, ${spanLabel}`}
      who={who}
      meId={meId}
      value={who.length ? `${best} working days in a row` : undefined}
      none="Nobody has sent on two working days in a row yet."
    />
  );
}

/** One cell of the leaders strip: a plain title, who leads, and the number that earned it. */
export function LeaderBody({
  title,
  rule,
  who,
  meId,
  value,
  none,
}: {
  title: string;
  rule?: string;
  who?: Person[];
  meId?: string;
  value?: string;
  none?: string;
}) {
  const named = who ?? [];
  return (
    <div className="game-leader">
      <span className="game-leader-title">
        {title}
        {rule && <span className="sr-only">: {rule}</span>}
      </span>
      {named.length ? (
        <span className="game-leader-who">
          {named.length === 1 && <Avatar name={named[0].name} admin={named[0].admin} />}
          <b title={named.map((p) => p.name).join(", ")}>
            {named.length === 1 ? (named[0].id === meId ? `${named[0].name} (you)` : named[0].name) : named.length === 2 ? `${named[0].name.split(" ")[0]} and ${named[1].name.split(" ")[0]}` : `${named.length} people, tied`}
          </b>
        </span>
      ) : (
        <span className="game-leader-none">{who === undefined ? " " : none}</span>
      )}
      <span className="game-leader-n">{named.length ? value : rule}</span>
    </div>
  );
}

/** The viewer's stamps: the ones they have, the next few to aim for, and the rest still to find. */
export function YourStamps({ id }: { id: string }) {
  const w = useWorked(id);
  const f = w?.facts;
  return (
    <section className="card game-stamps" aria-labelledby="stamps-title">
      <div className="card-head">
        <h2 id="stamps-title">Your stamps</h2>
        <span className="aside">{f ? `${earnedStamps(f).length} of ${STAMPS.length} earned` : " "}</span>
      </div>
      {f ? <StampShelf facts={f} /> : <div style={{ minHeight: 160 }} />}
    </section>
  );
}
