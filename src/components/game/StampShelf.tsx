import { STAMPS, earnedStamps, nextStamps, type Stamp, type StampFacts } from "@/lib/game";
import { Seal } from "./Seal";
import { stampHue } from "./StampArt";

/** How far along a stamp is, 0 to 1. */
function fraction(s: Stamp, facts: StampFacts): number {
  const p = s.progress(facts);
  return p.need > 0 ? p.have / p.need : 0;
}

/**
 * The whole stamp collection in one place: the ones you have, the three closest to earning, and the rest as a
 * quiet row so you can see what else exists. It draws only the inside of a card (its own padding included), so it
 * sits under the card's title line.
 */
export function StampShelf({ facts }: { facts: StampFacts }) {
  const got = earnedStamps(facts);
  const next = nextStamps(facts, 3);
  const nextIds = new Set(next.map((n) => n.stamp.id));
  const gotIds = new Set(got.map((s) => s.id));
  const rest = STAMPS.filter((s) => !gotIds.has(s.id) && !nextIds.has(s.id));

  return (
    <div className="st-shelf">
      {got.length > 0 ? (
        <ul className="st-grid" aria-label="Stamps you have earned">
          {got.map((s) => (
            <li key={s.id} className="st-tile" data-tip={s.how}>
              <Seal id={s.id} mark={s.mark} size="lg" earned />
              <span className="st-text">
                <b className="st-name">{s.name}</b>
                <span className="st-how">{s.how}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="st-empty">Your first stamp comes with your first tracked email.</p>
      )}

      {next.length > 0 && (
        <section className="st-part">
          <h3 className="st-sub">Up next</h3>
          <ul className="st-next" aria-label="Stamps to earn next">
            {next.map(({ stamp: s, have, need, unit }) => (
              <li key={s.id} className={`st-row st-h-${stampHue(s.id)}`}>
                <Seal id={s.id} mark={s.mark} progress={fraction(s, facts)} />
                <span className="st-text">
                  <b className="st-name">{s.name}</b>
                  <span className="st-how">{s.how}</span>
                  {have > 0 && need > 1 && (
                    <span className="st-count-line">
                      <span className="st-bar" role="progressbar" aria-label={`${s.name}: how far along`} aria-valuemin={0} aria-valuemax={need} aria-valuenow={have}>
                        <span style={{ width: `${(have / need) * 100}%` }} />
                      </span>
                      <span className="num">
                        {have} of {need}
                        {unit ? ` ${unit}` : ""}
                      </span>
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {rest.length > 0 && (
        <section className="st-part">
          <h3 className="st-sub">Still to find</h3>
          <ul className="st-rest" aria-label="Stamps still to find">
            {rest.map((s) => (
              <li key={s.id} className="st-faint" data-tip={s.how}>
                <Seal id={s.id} mark={s.mark} />
                <span className="st-name">{s.name}</span>
                <span className="sr-only">. {s.how}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
