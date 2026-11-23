import { ChartCard, ChartEmpty, Donut, OUTCOME, type Slice } from "@/components/charts";
import { percent } from "@/lib/format";

/**
 * "What happened to your emails": every sent email in exactly one slice.
 * Clicked and opened-without-a-click are separate slices, so nothing is counted twice;
 * the middle shows both together as the open rate.
 */
export function Outcomes({
  title = "What happened to your emails",
  sent,
  clicked,
  openedOnly,
  maybe,
  waiting,
}: {
  title?: string;
  sent: number;
  clicked: number;
  openedOnly: number;
  maybe: number;
  waiting: number;
}) {
  const slices: Slice[] = [
    { key: "clicked", label: OUTCOME.clicked.label, value: clicked, color: OUTCOME.clicked.color },
    { key: "opened", label: "Opened, no click", value: openedOnly, color: OUTCOME.opened.color },
    { key: "maybe", label: OUTCOME.maybe.label, value: maybe, color: OUTCOME.maybe.color },
    { key: "waiting", label: OUTCOME.waiting.label, value: waiting, color: OUTCOME.waiting.color },
  ];
  return (
    <ChartCard title={title} note={sent ? `All ${sent} sent ${sent === 1 ? "email" : "emails"}` : "Sent emails only"}>
      {sent === 0 ? (
        <ChartEmpty>Nothing sent yet. Once an email is sent, you will see here who opened it.</ChartEmpty>
      ) : (
        <Donut slices={slices} centerValue={percent(clicked + openedOnly, sent)} centerLabel="opened" label={`What happened to ${sent} sent emails`} />
      )}
    </ChartCard>
  );
}
