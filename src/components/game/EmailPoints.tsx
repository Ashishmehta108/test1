import { POINTS_MAX, emailPointSteps, pointsForEmail, type EmailOutcome } from "@/lib/game";
import { PointChip } from "./PointChip";

/** The state mark in front of each step: a ringed tick in the step's colour when earned, a dashed grey ring when still to earn. */
function StepMark({ earned }: { earned: boolean }) {
  return (
    <svg className={`gb-step-mark${earned ? " on" : ""}`} viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9.5" pathLength={32} />
      {earned && <path className="gb-step-tick" d="M8 12.4l2.9 2.9L16.2 9.4" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

/**
 * "Points from this email": the three ways one email earns points, each either earned (a flat chip and a tick, neutral for
 * the send, green for the open, sky blue for the click) or still to earn (a dashed, quiet one), the total so far, and a
 * three-part bar (1 + 3 + 2) filled as far as it has got, each part in its own colour.
 * `owner` names whose points they are when an admin looks at someone else's email.
 */
export function EmailPoints({ status, owner }: { status: EmailOutcome; owner?: string }) {
  const steps = emailPointSteps(status);
  const got = pointsForEmail(status);
  return (
    <section className="card gb-email" aria-labelledby="points-heading">
      <div className="card-head">
        <h2 id="points-heading">Points from this email</h2>
        {owner && <span className="aside">{owner}&apos;s points</span>}
      </div>
      <ul className="gb-steps">
        {steps.map((s) => (
          <li key={s.key} className={`gb-k-${s.key}${s.earned ? " on" : ""}`}>
            <StepMark earned={s.earned} />
            <span className="gb-step-label">
              {s.label}
              {s.earned && <span className="sr-only">, earned</span>}
            </span>
            <PointChip points={s.points} earned={s.earned} kind={s.key} />
          </li>
        ))}
      </ul>
      <div className="gb-total">
        <p className="gb-total-line">
          <b className="num">
            {got} of {POINTS_MAX}
          </b>{" "}
          points
        </p>
        <div className="gb-seg" role="progressbar" aria-label="Points from this email" aria-valuemin={0} aria-valuemax={POINTS_MAX} aria-valuenow={got}>
          {steps.map((s) => (
            <span key={s.key} className={`gb-k-${s.key}${s.earned ? " on" : ""}`} style={{ flexGrow: s.points }} />
          ))}
        </div>
        {status === "maybe" && <p className="gb-total-note">Maybe opened earns nothing extra.</p>}
      </div>
    </section>
  );
}
