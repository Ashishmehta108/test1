"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AccountIcon, InsightsIcon, LeaderboardIcon, ProfileIcon, ResultsIcon, TeamIcon } from "./ShellIcons";

type Item = { href: string; label: string; icon: ReactNode; active: boolean };

/** The pages, as words with a small drawing each. The current one is marked in the app's blue. */
export function Nav({ admin }: { admin: boolean }) {
  const path = usePathname();
  const items: Item[] = [
    { href: "/", label: "Results", icon: <ResultsIcon />, active: path === "/" || path.startsWith("/emails") },
    { href: "/insights", label: "Insights", icon: <InsightsIcon />, active: path.startsWith("/insights") },
    { href: "/leaderboard", label: "Leaderboard", icon: <LeaderboardIcon />, active: path.startsWith("/leaderboard") },
    { href: "/profile", label: "Profile", icon: <ProfileIcon />, active: path === "/profile" },
    ...(admin ? [{ href: "/team", label: "Team", icon: <TeamIcon />, active: path.startsWith("/team") }] : []),
    { href: "/account", label: "Account", icon: <AccountIcon />, active: path === "/account" },
  ];
  return (
    <nav className="nav" aria-label="Main">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={i.active ? "page" : undefined} data-tip={i.label}>
          <span className="nav-ic" aria-hidden="true">
            {i.icon}
          </span>
          <span className="nav-label">{i.label}</span>
        </Link>
      ))}
    </nav>
  );
}
