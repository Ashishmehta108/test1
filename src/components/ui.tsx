import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { STATUS_LABEL, STATUS_TAG } from "@/lib/format";
import type { Status } from "@/db/schema";

export function StatusTag({ status }: { status: Status }) {
  return <span className={`tag ${STATUS_TAG[status]}`}>{STATUS_LABEL[status]}</span>;
}

/** Everyone keeps the same bright colour wherever their initials appear, picked from their name. */
const AVATAR_HUES = ["coral", "orange", "sun", "lime", "green", "teal", "sky", "blue", "indigo", "violet", "magenta", "rose"] as const;
function avatarHue(name: string) {
  let h = 0;
  for (const ch of name.trim().toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_HUES[h % AVATAR_HUES.length];
}

export function Avatar({ name, admin = false }: { name: string; admin?: boolean }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join("") || "?";
  return (
    <span className={`avatar ${admin ? "avatar-admin" : ""}`} aria-hidden="true" style={{ "--av": `var(--g-${avatarHue(name)})`, "--av-wash": `var(--g-${avatarHue(name)}-wash)`, "--av-ink": `var(--g-${avatarHue(name)}-ink)` } as CSSProperties}>
      {initials}
    </span>
  );
}

export function Notice({ kind, children }: { kind: "ok" | "error" | "info"; children: ReactNode }) {
  return (
    <div className={`notice notice-${kind}`} role={kind === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}

/**
 * The top of every page: an optional way back, the title (with an optional tag beside it),
 * one line under it, and the page's main button(s) on the right (pass them as children).
 */
export function PageHead({
  title,
  sub,
  back,
  tag,
  children,
}: {
  title: ReactNode;
  sub?: ReactNode;
  back?: { href: string; label: string };
  tag?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div className="titles">
        {back && (
          <Link href={back.href} className="crumb">
            {back.label}
          </Link>
        )}
        <div className="title-row">
          <h1>{title}</h1>
          {tag}
        </div>
        {sub && <p className="muted">{sub}</p>}
      </div>
      {children && <div className="actions">{children}</div>}
    </div>
  );
}

/** The top line of a card: its title, and a quiet note or a control on the right. */
export function CardHead({ title, aside, children }: { title: string; aside?: ReactNode; children?: ReactNode }) {
  return (
    <div className="card-head">
      <h2>{title}</h2>
      {aside && <span className="aside">{aside}</span>}
      {children}
    </div>
  );
}

/** A row of headline numbers in one card. Put <Stat> inside. */
export function Stats({ children, label = "Summary", cols }: { children: ReactNode; label?: string; cols?: number }) {
  return (
    <section className="stats" aria-label={label} style={cols ? ({ "--cols": cols } as CSSProperties) : undefined}>
      {children}
    </section>
  );
}

/** One headline number: what it is, the number, and one quiet line under it. */
export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="stat">
      <span className="l">{label}</span>
      <span className="v">{value}</span>
      <span className="sub">{sub ?? " "}</span>
    </div>
  );
}

/** Admins choose whose numbers they are looking at. `hrefFor` gives the link for a person. */
export function PeoplePicker({
  people,
  meId,
  viewing,
  hrefFor,
  everyone,
  label,
}: {
  people: { id: string; name: string; role: string }[];
  meId: string;
  viewing: string;
  hrefFor: (id: string) => string;
  /** Adds an "Everyone" choice in front: the whole team added together. */
  everyone?: { href: string; current: boolean };
  label: string;
}) {
  return (
    <div className="people" aria-label={label}>
      <span className="lbl">Showing</span>
      {everyone && (
        <Link className="person-chip person-chip-all" href={everyone.href} aria-current={everyone.current ? "true" : undefined}>
          Everyone
        </Link>
      )}
      {people.map((p) => (
        <Link key={p.id} className="person-chip" href={hrefFor(p.id)} aria-current={p.id === viewing ? "true" : undefined}>
          <Avatar name={p.name} admin={p.role === "admin"} />
          {p.id === meId ? "You" : p.name}
        </Link>
      ))}
    </div>
  );
}

/** What a list shows when it has nothing in it: a short title, one line, and one thing to do. */
export function Empty({ title, children, action, small = false }: { title?: string; children?: ReactNode; action?: ReactNode; small?: boolean }) {
  return (
    <div className={`empty${small ? " empty-sm" : ""}`}>
      {title && <h2>{title}</h2>}
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
