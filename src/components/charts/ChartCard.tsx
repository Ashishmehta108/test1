import type { CSSProperties, ReactNode } from "react";

/**
 * The card every chart sits in: a title, an optional one-line note under it,
 * an optional thing on the right (a legend, a small switch), then the chart.
 */
export function ChartCard({
  title,
  note,
  aside,
  children,
  className = "",
}: {
  title: string;
  note?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card chart ${className}`.trim()} aria-label={title}>
      <header className="chart-head">
        <div>
          <h2 className="card-title">{title}</h2>
          {note && <p className="chart-note">{note}</p>}
        </div>
        {aside && <div className="chart-aside">{aside}</div>}
      </header>
      {children}
    </section>
  );
}

/**
 * What a chart card says when there is nothing to draw yet: a dashed picture (the app's "not yet" look) and one plain line.
 * Pick the picture and hue that match what the chart is about (default: bars, sky).
 */
export function ChartEmpty({ children }: { children: ReactNode }) {
  return <p className="chart-empty">{children}</p>;
}

/** One quiet line under a chart that says what it shows, for example the busiest hour. */
export function ChartFoot({ children }: { children: ReactNode }) {
  return <p className="chart-foot">{children}</p>;
}

/** Dots and names that say which colour is which. A number after the name is optional. */
export function Legend({ items }: { items: { label: string; color: string; value?: ReactNode }[] }) {
  return (
    <div className="legend">
      {items.map((it) => (
        <span key={it.label}>
          <i style={{ "--c": it.color } as CSSProperties} />
          {it.label}
          {it.value !== undefined && it.value !== null && <b>{it.value}</b>}
        </span>
      ))}
    </div>
  );
}
