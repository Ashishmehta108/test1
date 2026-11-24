import Link from "next/link";
import { deleteUser, renewInvite, setActive } from "@/app/actions";
import { StackBar, pct } from "@/components/charts";
import { ConfirmButton } from "@/components/ConfirmButton";
import { LevelMark } from "@/components/game/LevelMark";
import { SubmitButton } from "@/components/SubmitButton";
import { Avatar } from "@/components/ui";
import { levelFor, points } from "@/lib/game";
import { EditMember } from "./EditMember";
import { outcomeSlices } from "./outcomes";

export type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  hasPassword: boolean;
  inviteToken: string | null;
  inviteValid: boolean;
  /** Emails sent (not counting ones still to be sent). */
  sent: number;
  /** Opened or clicked. */
  opened: number;
  clicked: number;
  justOpened: number;
  maybe: number;
  waiting: number;
};

/** One person: who they are, how their emails did, and what you can do with them. */
export function MemberRow({ m, isMe }: { m: Member; isMe: boolean }) {
  const pending = !m.hasPassword;
  // Same rules as the leaderboard: all-time points from emails sent, opened and clicked.
  const allPoints = points({ sent: m.sent, opened: m.opened, clicked: m.clicked });
  const level = levelFor(allPoints).level;
  return (
    <li className={`member${pending ? " member-pending" : ""}${m.active ? "" : " member-paused"}`}>
      <Avatar name={m.name} admin={m.role === "admin"} />

      <div className="member-main">
        <div className="member-name">
          <b className="member-title" title={m.name}>
            {m.name}
          </b>
          {isMe && <span className="member-you">(you)</span>}
          {!pending && (
            <span className="member-level num" data-tip={`${allPoints} ${allPoints === 1 ? "point" : "points"} in all`}>
              <LevelMark level={level} size="sm" decorative />
              Level {level}
            </span>
          )}
          {m.role === "admin" && <span className="pill pill-admin">Admin</span>}
          {!m.active && <span className="pill pill-paused">Paused</span>}
          {pending && m.active && <span className="pill pill-pending">{m.inviteValid ? "Invite sent" : "Invite expired"}</span>}
        </div>
        <span className="member-email" title={m.email}>
          {m.email}
        </span>
        <div className="member-stats">
          {pending ? (
            <span>Hasn&apos;t joined yet</span>
          ) : (
            <>
              <div className="member-bar">
                <StackBar
                  label={`How ${m.name}'s emails did`}
                  slices={outcomeSlices({ clicked: m.clicked, opened: m.justOpened, maybe: m.maybe, waiting: m.waiting })}
                />
              </div>
              <span className="num">{m.sent === 0 ? "No emails sent yet" : `${m.sent} sent · ${pct(m.opened, m.sent)} opened`}</span>
            </>
          )}
        </div>
      </div>

      <div className="member-actions">
        {!pending && (
          <Link className="btn btn-sm act-main" href={isMe ? "/" : `/?user=${m.id}`}>
            View results
          </Link>
        )}
        {pending && m.active && m.inviteValid && (
          <Link className="btn btn-sm act-main" href={`/team?invited=${m.id}`}>
            Show invite link
          </Link>
        )}
        {pending && m.active && !m.inviteValid && (
          <form action={renewInvite.bind(null, m.id)} className="act-main">
            <SubmitButton className="btn btn-sm" pendingText="Creating…">
              New invite link
            </SubmitButton>
          </form>
        )}
        <EditMember id={m.id} name={m.name} email={m.email} isMe={isMe} joined={!pending} />
        {!isMe &&
          (m.active ? (
            <form action={setActive.bind(null, m.id, false)} className="act-second confirm">
              <ConfirmButton className="btn btn-sm btn-quiet" label="Pause" confirmLabel="Click to confirm" pendingText="Pausing…" />
            </form>
          ) : (
            <form action={setActive.bind(null, m.id, true)} className="act-second">
              <SubmitButton className="btn btn-sm" pendingText="Turning on…">
                Turn back on
              </SubmitButton>
            </form>
          ))}
        {!isMe && (
          <form action={deleteUser.bind(null, m.id)} className="act-delete confirm">
            <ConfirmButton
              className="btn btn-sm btn-quiet btn-danger"
              label="Delete"
              confirmLabel={m.sent > 0 ? "Delete them and their emails?" : "Click to delete"}
              pendingText="Deleting…"
            />
          </form>
        )}
      </div>
    </li>
  );
}
