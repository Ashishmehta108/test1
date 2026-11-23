import { LEVELS, POINTS_CLICKED, POINTS_OPENED, POINTS_SENT } from "@/lib/game";

/** How points work, in plain words, and the level steps. */
export function HowPoints() {
  const each = POINTS_SENT + POINTS_OPENED;
  return (
    <section className="card game-how" aria-labelledby="how-title">
      <div className="card-head">
        <h2 id="how-title">How points work</h2>
      </div>
      <dl className="facts">
        <div className="fact">
          <dt>Each tracked email you send</dt>
          <dd className="num">{POINTS_SENT} point</dd>
        </div>
        <div className="fact">
          <dt>When it is opened</dt>
          <dd className="num">{POINTS_OPENED} more</dd>
        </div>
        <div className="fact">
          <dt>When a link in it is clicked</dt>
          <dd className="num">{POINTS_CLICKED} more</dd>
        </div>
        <div className="fact">
          <dt>Maybe opened</dt>
          <dd className="num faint">nothing extra</dd>
        </div>
      </dl>
      <p className="quiet-note">
        So one email is worth {POINTS_SENT}, {each} or {each + POINTS_CLICKED} points. The board counts emails by the day they were sent. Levels come from all the points you have ever earned and
        never go down: Level 2 starts at {LEVELS[1]}, Level 3 at {LEVELS[2]}, Level 4 at {LEVELS[3]}.
      </p>
    </section>
  );
}
