"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { STAMPS, type Stamp } from "@/lib/game";
import type { ServerFacts } from "./GameData";
import { Seal } from "./Seal";
import { workOut } from "./useMyGame";

type Seen = { level: number; stamps: string[]; points: number };
type Item = { id: number } & ({ kind: "stamp"; stamp: Stamp } | { kind: "level"; level: number; next: number } | { kind: "points"; by: number; level: number; toGo: number });

/** How long a card stays before it closes on its own (paused while the pointer or focus is on it). */
const STAY_MS = 8000;
const STAY_POINTS_MS = 5000;

const storeKey = (userId: string) => `ot_game_seen:${userId}`;
function readSeen(userId: string): Seen | null {
  try {
    const raw = window.localStorage.getItem(storeKey(userId));
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Seen>;
    if (typeof v.level !== "number" || !Array.isArray(v.stamps) || typeof v.points !== "number") return null;
    return { level: v.level, stamps: v.stamps.filter((s): s is string => typeof s === "string"), points: v.points };
  } catch {
    return null;
  }
}
function writeSeen(userId: string, seen: Seen) {
  try {
    window.localStorage.setItem(storeKey(userId), JSON.stringify(seen));
  } catch {
    // Storage blocked or full: the app works the same, it just can't tell what is new.
  }
}

/**
 * Small rewards in the moment. Mounted once in the app layout. It compares the viewer's level, stamps and points
 * with what this browser last saw, and shows a quiet card in the corner for anything new. The first visit only
 * remembers, so nobody gets a flood of old stamps. Points going up shows only when it happens while the page is
 * open (for example right after "I've sent it").
 */
export function GameToasts({
  userId,
  total,
  level,
  toGo,
  nextAt,
  facts,
  times,
}: {
  userId: string;
  total: number;
  level: number;
  toGo: number;
  nextAt: number;
  facts: ServerFacts;
  times: string[];
}) {
  const [queue, setQueue] = useState<Item[]>([]);
  const nextId = useRef(1);
  const ranBefore = useRef(false);
  const key = JSON.stringify([userId, total, level, facts, times]);

  useEffect(() => {
    const now: Seen = { level, stamps: workOut(facts, times).earned.map((s) => s.id), points: total };
    const seen = readSeen(userId);
    const add: Item[] = [];
    const id = () => nextId.current++;

    if (seen) {
      if (ranBefore.current && total > seen.points) add.push({ id: id(), kind: "points", by: total - seen.points, level, toGo });
      for (const sid of now.stamps) {
        const stamp = STAMPS.find((s) => s.id === sid);
        if (stamp && !seen.stamps.includes(sid)) add.push({ id: id(), kind: "stamp", stamp });
      }
      if (level > seen.level) add.push({ id: id(), kind: "level", level, next: nextAt });
    }
    // A preview-only way to see the cards (never in production): add ?toast=demo to any page.
    if (process.env.NODE_ENV !== "production" && !ranBefore.current && new URLSearchParams(window.location.search).get("toast") === "demo") {
      add.push({ id: id(), kind: "points", by: 1, level, toGo });
      add.push({ id: id(), kind: "stamp", stamp: STAMPS.find((s) => s.id === "streak-5")! });
      add.push({ id: id(), kind: "level", level, next: nextAt });
    }

    writeSeen(userId, {
      level: Math.max(level, seen?.level ?? 0),
      stamps: Array.from(new Set([...(seen?.stamps ?? []), ...now.stamps])),
      points: total,
    });
    ranBefore.current = true;
    if (add.length) setQueue((q) => [...q, ...add]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = queue[0];
  const [paused, setPaused] = useState(false);
  const close = () => setQueue((q) => q.slice(1));

  useEffect(() => {
    if (!current || paused) return;
    const t = window.setTimeout(() => setQueue((q) => (q[0]?.id === current.id ? q.slice(1) : q)), current.kind === "points" ? STAY_POINTS_MS : STAY_MS);
    return () => window.clearTimeout(t);
  }, [current, paused]);

  // Nothing is left paused once the card it belonged to has gone.
  useEffect(() => setPaused(false), [current?.id]);

  return (
    <div className="game-toasts" role="status" aria-live="polite">
      {current && (
        <div
          key={current.id}
          className={`game-toast${current.kind === "points" ? " small" : ""}`}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
        >
          {current.kind === "points" ? (
            <span className="game-plus num" aria-hidden="true">
              +{current.by}
            </span>
          ) : (
            <span className="st-press">
              <Seal id={current.kind === "stamp" ? current.stamp.id : undefined} mark={current.kind === "stamp" ? current.stamp.mark : `L${current.level}`} earned />
            </span>
          )}
          <span className="game-toast-text">
            {current.kind === "stamp" && (
              <>
                <b>New stamp: {current.stamp.name}</b>
                <span>{current.stamp.how}</span>
                <Link href="/leaderboard#stamps-title" onClick={close}>See your stamps</Link>
              </>
            )}
            {current.kind === "level" && (
              <>
                <b>You reached Level {current.level}</b>
                <span>Levels never go down. The next one starts at {current.next} points.</span>
                <Link href="/leaderboard" onClick={close}>See the leaderboard</Link>
              </>
            )}
            {current.kind === "points" && (
              <>
                <b>
                  {current.by} {current.by === 1 ? "point" : "points"} added
                </b>
                <span className="num">
                  Level {current.level} · {current.toGo} {current.toGo === 1 ? "point" : "points"} to Level {current.level + 1}
                </span>
              </>
            )}
          </span>
          <button type="button" className="btn btn-quiet game-toast-x" aria-label="Close" onClick={close}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
