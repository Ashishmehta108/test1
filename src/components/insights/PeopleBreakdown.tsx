import Link from "next/link";
import { ChartCard, ChartEmpty, Legend, OUTCOME, StackBar, pct, type OutcomeKey } from "@/components/charts";
import { Avatar } from "@/components/ui";

export type PersonOutcomes = {
  id: string;
  name: string;
  admin: boolean;
  clicked: number;
  opened: number;
  maybe: number;
  waiting: number;
};

const PARTS: Exclude<OutcomeKey, "draft">[] = ["clicked", "opened", "maybe", "waiting"];

/**
 * Admin only: one row per person, what happened to the emails they sent in the period.
 * The bar shows the split; the sent count and open rate beside it are the numbers to read.
 */
export function PeopleBreakdown({ people, meId }: { people: PersonOutcomes[]; meId: string }) {
  const rows = people
    .map((p) => ({ ...p, sent: p.clicked + p.opened + p.maybe + p.waiting }))
    .sort((a, b) => b.sent - a.sent || a.name.localeCompare(b.name));
  const anySent = rows.some((r) => r.sent > 0);

  return (
    <ChartCard
      title="How each person is doing"
      note="What happened to the emails each person sent in the last 30 days"
      aside={anySent ? <Legend items={PARTS.map((k) => ({ label: OUTCOME[k].label, color: OUTCOME[k].color }))} /> : undefined}
    >
      {!anySent ? (
        <ChartEmpty>Nobody has sent a tracked email in the last 30 days.</ChartEmpty>
      ) : (
        <ul className="who-rows">
          {rows.map((r) => (
            <li className="who-row" key={r.id}>
              <Link className="who-name" href={r.id === meId ? "/insights" : `/insights?user=${r.id}`} title={`See ${r.name}'s insights`}>
                <Avatar name={r.name} admin={r.admin} />
                <span>{r.id === meId ? `${r.name} (you)` : r.name}</span>
              </Link>
              <StackBar label={`${r.name}'s emails`} slices={PARTS.map((k) => ({ key: k, label: OUTCOME[k].label, value: r[k], color: OUTCOME[k].color }))} />
              <span className="who-n">
                <b>{r.sent}</b> sent
              </span>
              <span className="who-n">
                <b>{r.sent ? pct(r.clicked + r.opened, r.sent) : "—"}</b> opened
              </span>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}
