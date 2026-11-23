import type { ReactNode } from "react";

/** What a list or card says when it has nothing in it: a short title, one plain line, and the one thing to do. */
export function ResultsEmpty({ title, children, action, small = false }: { title: string; children?: ReactNode; action?: ReactNode; small?: boolean }) {
  return (
    <div className={`empty${small ? " empty-sm" : ""}`}>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
