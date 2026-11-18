import Link from "next/link";
import { logout } from "@/app/actions";
import { Nav } from "@/components/Nav";
import { Avatar } from "@/components/ui";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="brand">
            <span className="brand-mark" aria-hidden="true" />
            Open Tracker
          </Link>
          <Nav admin={user.role === "admin"} />
          <div className="me">
            <Avatar name={user.name} admin={user.role === "admin"} />
            <span className="name">{user.name}</span>
            <form action={logout} className="inline-form">
              <button className="btn btn-quiet btn-sm" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="main">{children}</main>
    </>
  );
}
