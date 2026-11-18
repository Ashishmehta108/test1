"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav({ admin }: { admin: boolean }) {
  const path = usePathname();
  const items = [
    { href: "/", label: "Results", active: path === "/" || path.startsWith("/emails") },
    { href: "/new", label: "Track an email", active: path === "/new" },
    ...(admin ? [{ href: "/team", label: "Team", active: path.startsWith("/team") }] : []),
    { href: "/account", label: "Account", active: path === "/account" },
  ];
  return (
    <nav className="nav" aria-label="Main">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={i.active ? "page" : undefined}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
