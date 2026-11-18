import { headers } from "next/headers";
import Link from "next/link";
import { inviteUser, renewInvite, setActive } from "@/app/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CopyTextButton } from "@/components/Copy";
import { SubmitButton } from "@/components/SubmitButton";
import { Avatar, Notice } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { iso, q } from "@/lib/db";
import { percent } from "@/lib/format";
import { baseUrl } from "@/lib/request";

type SP = Promise<Record<string, string | string[] | undefined>>;

const ERRORS: Record<string, string> = {
  name: "Add their name so you can tell people apart.",
  email: "That email address doesn't look right.",
  exists: "Someone with that email is already on the team.",
  self: "You can't pause your own account.",
};

type Member = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  active: boolean;
  has_password: boolean;
  invite_token: string | null;
  invite_valid: boolean;
  sent: number;
  opened: number;
};

export default async function TeamPage({ searchParams }: { searchParams: SP }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const v = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const base = baseUrl(await headers());

  const members = await q<Member>(
    `SELECT u.id, u.name, u.email, u.role, u.active,
            (u.password_hash IS NOT NULL) AS has_password,
            u.invite_token, (u.invite_expires > $1) AS invite_valid,
            CAST(COALESCE(SUM(CASE WHEN e.status <> 'draft' THEN 1 ELSE 0 END), 0) AS integer) AS sent,
            CAST(COALESCE(SUM(CASE WHEN e.status IN ('opened','clicked') THEN 1 ELSE 0 END), 0) AS integer) AS opened
       FROM users u LEFT JOIN emails e ON e.owner_id = u.id
      GROUP BY u.id
      ORDER BY u.role = 'admin' DESC, u.created_at`,
    [iso()],
  );

  const invited = members.find((m) => m.id === v("invited") && m.invite_token);
  const error = ERRORS[v("error")];

  return (
    <>
      <div className="page-head">
        <div className="titles">
          <h1>Team</h1>
          <p className="muted">Everyone sees only their own results. You can open anyone&apos;s results from here.</p>
        </div>
      </div>

      {error && <Notice kind="error">{error}</Notice>}
      {invited && (
        <div className="card card-pad invite-box" style={{ borderColor: "#d6e1f2", background: "var(--blue-wash)" }}>
          <h3>Send this link to {invited.name}</h3>
          <p className="small muted">
            Share it on WhatsApp, Slack or email. They open it and choose a password. It works once and expires in 3 days.
          </p>
          <div className="code-line">{`${base}/invite/${invited.invite_token}`}</div>
          <div className="actions">
            <CopyTextButton text={`${base}/invite/${invited.invite_token}`} label="Copy invite link" />
          </div>
        </div>
      )}

      <div className="team-grid">
        <section className="card" aria-label="Team members">
          {members.map((m) => {
            const pending = !m.has_password;
            return (
              <div className="member" key={m.id}>
                <Avatar name={m.name} admin={m.role === "admin"} />
                <div className="meta">
                  <b>
                    {m.name}
                    {m.id === me.id && <span className="faint small">(you)</span>}
                    {m.role === "admin" && <span className="pill pill-admin">Admin</span>}
                    {!m.active && <span className="pill pill-paused">Paused</span>}
                    {pending && m.active && (
                      <span className="pill pill-pending">{m.invite_valid ? "Invite sent" : "Invite expired"}</span>
                    )}
                  </b>
                  <span>{m.email}</span>
                  {!pending && (
                    <span className="member-stats">
                      {m.sent === 0 ? "No emails sent yet" : `${m.sent} sent · ${percent(m.opened, m.sent)} opened`}
                    </span>
                  )}
                </div>
                <div className="member-actions">
                  {!pending && (
                    <Link className="btn btn-sm" href={m.id === me.id ? "/" : `/?user=${m.id}`}>
                      View results
                    </Link>
                  )}
                  {pending && m.active && m.invite_valid && (
                    <Link className="btn btn-sm" href={`/team?invited=${m.id}`}>
                      Show invite link
                    </Link>
                  )}
                  {pending && m.active && !m.invite_valid && (
                    <form action={renewInvite.bind(null, m.id)} className="inline-form">
                      <SubmitButton className="btn btn-sm" pendingText="Creating…">
                        New invite link
                      </SubmitButton>
                    </form>
                  )}
                  {m.id !== me.id &&
                    (m.active ? (
                      <form action={setActive.bind(null, m.id, false)} className="inline-form">
                        <ConfirmButton
                          className="btn btn-sm btn-quiet btn-danger"
                          label="Pause"
                          confirmLabel="Click to confirm"
                          pendingText="Pausing…"
                        />
                      </form>
                    ) : (
                      <form action={setActive.bind(null, m.id, true)} className="inline-form">
                        <SubmitButton className="btn btn-sm" pendingText="Turning on…">
                          Turn back on
                        </SubmitButton>
                      </form>
                    ))}
                </div>
              </div>
            );
          })}
          {members.length === 1 && (
            <p className="quiet-note">It&apos;s just you so far. Add someone with the form on the right, and they&apos;ll get their own results.</p>
          )}
        </section>

        <section className="card card-pad">
          <form action={inviteUser} className="form">
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <h2>Add someone</h2>
              <p className="small muted">You&apos;ll get a link to send them.</p>
            </div>
            <div className="field">
              <label htmlFor="invite-name">Name</label>
              <input id="invite-name" name="name" className="input" required placeholder="Riya Kapoor" defaultValue={v("name")} />
            </div>
            <div className="field">
              <label htmlFor="invite-email">Email</label>
              <input
                id="invite-email"
                name="email"
                type="email"
                className="input"
                required
                placeholder="riya@yourcompany.com"
                defaultValue={v("email")}
              />
            </div>
            <SubmitButton className="btn btn-primary" pendingText="Creating…">
              Create invite link
            </SubmitButton>
          </form>
        </section>
      </div>
    </>
  );
}
