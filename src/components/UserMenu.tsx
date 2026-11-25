"use client";

import Link from "next/link";
import { LevelMark } from "@/components/game/LevelMark";
import { hueStyle, prizeFor } from "@/components/game/LevelPrize";
import type { Level } from "@/lib/game";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/actions";
import { THEME_COOKIE, THEME_OPTIONS, type Theme } from "@/lib/theme";
import { Avatar } from "./ui";

/** A person's level, as the menu shows it. */
export type MenuLevel = Level;

/** Your name and level at the bottom of the menu. Click it for your level, light/dark and signing out. */
export function UserMenu({ name, email, admin, theme: startTheme, level }: { name: string; email: string; admin: boolean; theme: Theme; level: MenuLevel }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [theme, setThemeState] = useState<Theme>(startTheme);

  // Light, dark or "match my device" changes at once in the browser. The choice is saved in a cookie
  // so the server draws the next page the same way. No trip to the server (or the database) is needed.
  const pickTheme = (next: Theme) => {
    setThemeState(next);
    const root = document.documentElement;
    if (next === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", next);
    const secure = window.location.protocol === "https:" ? "; secure" : "";
    document.cookie =
      next === "system"
        ? `${THEME_COOKIE}=; path=/; max-age=0; samesite=lax${secure}`
        : `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax${secure}`;
  };

  // Close when clicking anywhere else, or pressing Escape.
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false;
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  const pctDone = Math.round(level.progress * 100);
  const prize = prizeFor(level.level);
  const next = level.level + 1;
  const toGo = `${level.toGo.toLocaleString("en-US")} ${level.toGo === 1 ? "point" : "points"}`;
  const close = () => {
    if (ref.current) ref.current.open = false;
  };

  return (
    <details ref={ref} className="user-menu" style={hueStyle(prize.hue)}>
      <summary aria-label={`${name}, Level ${level.level}, ${prize.title}: your level, appearance and sign out`}>
        <Avatar name={name} admin={admin} />
        <span className="who-me">
          <span className="name">{name}</span>
          <span className="lvl num">
            <LevelMark level={level.level} state="reached" size="sm" decorative />
            <span className="lvl-text">
              Level {level.level} · {level.toGo.toLocaleString("en-US")} to go
            </span>
          </span>
          <span className="game-bar side-lvl-bar" aria-hidden="true">
            <span style={{ width: `${pctDone}%` }} />
          </span>
        </span>
        {/* On a phone the words are tucked away; the prize stays beside your initials. */}
        <span className="me-prize">
          <LevelMark level={level.level} state="reached" size="sm" decorative />
        </span>
        <svg className="chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 14l5-5 5 5" />
        </svg>
      </summary>
      <div className="user-pop">
        <div className="pop-who">
          <b>{name}</b>
          <span>{email}</span>
        </div>
        <Link href="/profile" className="pop-game" onClick={close}>
          <span className="pop-game-top">
            <LevelMark level={level.level} state="reached" size="md" decorative />
            <b>
              Level {level.level} · {prize.title}
            </b>
          </span>
          <span
            className="pop-line"
            role="progressbar"
            aria-label={`Progress from Level ${level.level} to Level ${next}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.floor(level.progress * 100)}
            aria-valuetext={`${toGo} to Level ${next}`}
          >
            <span className="lv-track">{level.progress > 0 && <span className="lv-fill" style={{ width: `${(level.progress * 100).toFixed(2)}%` }} />}</span>
            <LevelMark level={next} state="next" size="sm" decorative />
          </span>
          <span className="pop-game-sub num">
            {toGo} to Level {next}
          </span>
          <span className="pop-game-link">Your profile, prizes and stamps</span>
        </Link>
        <span className="pop-label" id="appearance-label">Appearance</span>
        <div className="segmented theme-toggle" role="group" aria-labelledby="appearance-label">
          {THEME_OPTIONS.map((o) => (
            <button key={o.value} type="button" aria-pressed={theme === o.value} onClick={() => pickTheme(o.value)}>
              {o.label}
            </button>
          ))}
        </div>
        <hr />
        <form action={logout}>
          <button type="submit" className="pop-item">
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}
