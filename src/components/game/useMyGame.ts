"use client";

import { useEffect, useState } from "react";
import { bestStreak, currentStreak, earnedStamps, nextStamps, recentWorkdays, sendDays, type NextStamp, type Stamp, type StampFacts } from "@/lib/game";
import type { ServerFacts } from "./GameData";

export type MyGame = {
  streak: number;
  recent: { key: string; date: Date; sent: boolean }[];
  facts: StampFacts;
  earned: Stamp[];
  next: NextStamp[];
};

/** Works out a person's streak and stamps in the browser (days are the viewer's own days). Null until it has run. */
export function workOut(facts: ServerFacts, times: string[], today = new Date()): MyGame {
  const days = sendDays(times);
  const all: StampFacts = { ...facts, bestStreak90: bestStreak(days, 90, today) };
  return {
    streak: currentStreak(days, today),
    recent: recentWorkdays(days, 10, today),
    facts: all,
    earned: earnedStamps(all),
    next: nextStamps(all, 1),
  };
}

export function useMyGame(facts: ServerFacts, times: string[]): MyGame | null {
  const [game, setGame] = useState<MyGame | null>(null);
  // Compared by value: the server sends new arrays on every refresh.
  const key = JSON.stringify([facts, times]);
  useEffect(() => {
    setGame(workOut(facts, times));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return game;
}
