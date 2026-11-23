import { ResultIcon } from "./icons";

/**
 * An open or click count in a table: a small drawn mark in the status colour (green for opens, violet for clicks)
 * and the number. A zero is just a quiet 0.
 */
export function CountMark({ kind, n }: { kind: "opens" | "clicks"; n: number }) {
  if (!n) return <span className="faint">0</span>;
  return (
    <span className={`rs-count rs-count-${kind}`}>
      <ResultIcon name={kind === "opens" ? "open" : "click"} size={16} stroke={2} />
      <span>{n}</span>
    </span>
  );
}
