import "@/app/skeleton.css";
import type { CSSProperties, ReactNode } from "react";

type Size = number | string;

/** A single grey placeholder bar (or circle/tag shape). Always hidden from screen readers. */
export function Skel({
  w = "100%",
  h = 12,
  r,
  round = false,
  tag = false,
  style,
}: {
  w?: Size;
  h?: Size;
  r?: Size;
  round?: boolean;
  tag?: boolean;
  style?: CSSProperties;
}) {
  const cls = ["skel", round && "skel-round", tag && "skel-tag"].filter(Boolean).join(" ");
  return <span aria-hidden="true" className={cls} style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

/** A bar centred inside a box of the height real text would take, so rows keep their size. */
export function SkelLine({ w = "100%", h = 12, box = 20 }: { w?: Size; h?: Size; box?: number }) {
  return (
    <div className="skel-line" style={{ height: box }} aria-hidden="true">
      <Skel w={w} h={h} />
    </div>
  );
}

/** Wraps a loading page: announces "Loading…" once to screen readers and lays out like the real page. */
export function SkelRoot({ children, gap = 28, maxWidth }: { children: ReactNode; gap?: number; maxWidth?: number }) {
  return (
    <div
      className="skel-root"
      role="status"
      aria-live="polite"
      style={{ gap, ...(maxWidth ? { maxWidth } : null) }}
    >
      <span className="skel-sr">Loading…</span>
      {children}
    </div>
  );
}
