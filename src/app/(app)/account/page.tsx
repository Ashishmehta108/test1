import { changePassword } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Avatar, Notice, PageHead } from "@/components/ui";
import { requireUser } from "@/lib/auth";

type SP = Promise<Record<string, string | string[] | undefined>>;

const ERRORS: Record<string, { text: string; field: "current" | "password" }> = {
  current: { text: "Your current password isn't right. Try typing it again.", field: "current" },
  short: { text: "Your new password needs at least 8 characters.", field: "password" },
};

export default async function AccountPage({ searchParams }: { searchParams: SP }) {
  const me = await requireUser();
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : undefined;
  const saved = sp.ok === "password";

  return (
    <>
      <PageHead title="Account" sub="Your details, and the password you sign in with." />

      <div className="account">
        <section className="card" aria-labelledby="details-title">
          <div className="card-head"><h2 id="details-title">Your details</h2></div>
          <dl className="facts">
            <div className="fact">
              <dt>Name</dt>
              <dd className="fact-who">
                <Avatar name={me.name} admin={me.role === "admin"} />
                {me.name}
              </dd>
            </div>
            <div className="fact">
              <dt>Email</dt>
              <dd>{me.email}</dd>
            </div>
            <div className="fact">
              <dt>Role</dt>
              <dd>{me.role === "admin" ? <span className="pill pill-admin">Admin</span> : <span className="pill">Team member</span>}</dd>
            </div>
          </dl>
          <p className="quiet-note">To change your name or sign-in email, ask your admin.</p>
        </section>

        <section className="card" aria-labelledby="password-title">
          <div className="card-head"><h2 id="password-title">Change password</h2></div>
          <form action={changePassword} className="card-pad form">
            {error && <Notice kind="error">{error.text}</Notice>}
            {saved && <Notice kind="ok">Your password has been changed. Use the new one next time you sign in.</Notice>}
            <div className="field">
              <label htmlFor="current">Current password</label>
              <input
                id="current"
                name="current"
                type="password"
                className="input"
                required
                autoComplete="current-password"
                aria-invalid={error?.field === "current" || undefined}
              />
            </div>
            <div className="field">
              <label htmlFor="password">New password</label>
              <input
                id="password"
                name="password"
                type="password"
                className="input"
                required
                minLength={8}
                autoComplete="new-password"
                aria-invalid={error?.field === "password" || undefined}
                aria-describedby="new-password-hint"
              />
              <span className="hint" id="new-password-hint">At least 8 characters.</span>
            </div>
            <div className="actions">
              <SubmitButton className="btn btn-primary" pendingText="Saving…">
                Save new password
              </SubmitButton>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
