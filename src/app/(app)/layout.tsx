import { cookies } from "next/headers";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { GameToasts } from "@/components/game/GameToasts";
import { getGameState } from "@/components/game/state";
import { Nav } from "@/components/Nav";
import { SideToggle } from "@/components/SideToggle";
import { PlaneIcon } from "@/components/ShellIcons";
import { TrackButton, TrackEmailModal } from "@/components/TrackEmail";
import { UserMenu } from "@/components/UserMenu";
import { requireUser } from "@/lib/auth";
import { THEME_COOKIE, themeFrom } from "@/lib/theme";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // The viewer's points and level: one small query, shared with the page through cache().
  const [jar, game] = await Promise.all([cookies(), getGameState(user.id)]);
  const theme = themeFrom(jar.get(THEME_COOKIE)?.value);
  const closed = jar.get("ot_side")?.value === "closed";
  return (
    <div className="shell" data-side={closed ? "closed" : "open"}>
      <aside className="side">
        <div className="side-top">
          <Link href="/" className="brand" aria-label="Open Tracker, your results">
            <BrandMark />
            <span className="brand-name">Open Tracker</span>
          </Link>
          <SideToggle closed={closed} />
        </div>
        <Nav admin={user.role === "admin"} />
        <TrackButton className="btn btn-primary side-track">
          <PlaneIcon />
          <span className="side-track-label">Track an email</span>
        </TrackButton>
        <div className="side-foot">
          <UserMenu name={user.name} email={user.email} admin={user.role === "admin"} theme={theme} level={game.level} />
        </div>
      </aside>
      <main className="main">{children}</main>
      <TrackEmailModal />
      <GameToasts
        userId={user.id}
        total={game.total}
        level={game.level.level}
        toGo={game.level.toGo}
        nextAt={game.level.to}
        facts={game.facts}
        times={game.times}
      />
    </div>
  );
}
