"use client";

import Link from "next/link";
import { useOptimistic } from "react";
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

type Shown = { name: string; email: string };

/**
 * One person: who they are, how their emails did, and what you can do with them.
 * Pause, turn on, delete and edit show their result on the row straight away. The real
 * answer from the server replaces it when it arrives, and if the server refuses, the row
 * goes back to how it was.
 */
export function MemberRow({ m, isMe }: { m: Member; isMe: boolean }) {
  const [active, showActive] = useOptimistic(m.active, (_before: boolean, next: boolean) => next);
  const [gone, showGone] = useOptimistic(false, (_before: boolean, next: true) => next);
  const [shown, showSaved] = useOptimistic<Shown, Shown>({ name: m.name, email: m.email }, (_before, next) => next);

  if (gone) return null;

  const pending = !m.hasPassword;
  // Same rules as the leaderboard: all-time points from emails sent, opened and clicked.
  const allPoints = points({ sent: m.sent, opened: m.opened, clicked: m.clicked });
  const level = levelFor(allPoints).level;
  return (
    <li className={`member${pending ? " member-pending" : ""}${active ? "" : " member-paused"}`}>
      <Avatar name={shown.name} admin={m.role === "admin"} />

      <div className="member-main">
        <div className="member-name">
          <b className="member-title" title={shown.name}>
            {shown.name}
          </b>
          {isMe && <span className="member-you">(you)</span>}
          {!pending && (
            <span className="member-level num" data-tip={`${allPoints} ${allPoints === 1 ? "point" : "points"} in all`}>
              <LevelMark level={level} size="sm" decorative />
              Level {level}
            </span>
          )}
          {m.role === "admin" && <span className="pill pill-admin">Admin</span>}
          {!active && <span className="pill pill-paused">Paused</span>}
          {pending && active && <span className="pill pill-pending">{m.inviteValid ? "Invite sent" : "Invite expired"}</span>}
        </div>
        <span className="member-email" title={shown.email}>
          {shown.email}
        </span>
        <div className="member-stats">
          {pending ? (
            <span>Hasn&apos;t joined yet</span>
          ) : (
            <>
              <div className="member-bar">
                <StackBar
                  label={`How ${shown.name}'s emails did`}
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
        {pending && active && m.inviteValid && (
          <Link className="btn btn-sm act-main" href={`/team?invited=${m.id}`}>
            Show invite link
          </Link>
        )}
        {pending && active && !m.inviteValid && (
          <form action={renewInvite.bind(null, m.id)} className="act-main">
            <SubmitButton className="btn btn-sm" pendingText="Creating link…">
              New invite link
            </SubmitButton>
          </form>
        )}
        <EditMember
          id={m.id}
          name={shown.name}
          email={shown.email}
          isMe={isMe}
          joined={!pending}
          onSaving={(values) => showSaved(values)}
        />
        {!isMe &&
          (active ? (
            <form
              action={async () => {
                showActive(false);
                await setActive(m.id, false);
              }}
              className="act-second confirm"
            >
              <ConfirmButton className="btn btn-sm btn-quiet" label="Pause" confirmLabel="Click to confirm" pendingText="Pausing…" />
            </form>
          ) : (
            <form
              action={async () => {
                showActive(true);
                await setActive(m.id, true);
              }}
              className="act-second"
            >
              <SubmitButton className="btn btn-sm" pendingText="Turning on…">
                Turn back on
              </SubmitButton>
            </form>
          ))}
        {!isMe && (
          <form
            action={async () => {
              showGone(true);
              await deleteUser(m.id);
            }}
            className="act-delete confirm"
          >
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
