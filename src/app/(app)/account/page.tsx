import { changePassword } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Notice } from "@/components/ui";
import { requireUser } from "@/lib/auth";

type SP = Promise<Record<string, string | string[] | undefined>>;

const ERRORS: Record<string, string> = {
  current: "Your current password isn't right.",
  short: "Your new password needs at least 8 characters.",
};

export default async function AccountPage({ searchParams }: { searchParams: SP }) {
  const me = await requireUser();
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : undefined;

  return (
    <div style={{ maxWidth: 520, width: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="page-head">
        <div className="titles">
          <h1>Account</h1>
          <p className="muted">
            {me.name} · {me.email}
          </p>
        </div>
      </div>

      {error && <Notice kind="error">{error}</Notice>}
      {sp.ok === "password" && <Notice kind="ok">Password changed.</Notice>}

      <form action={changePassword} className="card card-pad form">
        <h2>Change password</h2>
        <div className="field">
          <label htmlFor="current">Current password</label>
          <input id="current" name="current" type="password" className="input" required autoComplete="current-password" />
        </div>
        <div className="field">
          <label htmlFor="password">New password</label>
          <input id="password" name="password" type="password" className="input" required minLength={8} autoComplete="new-password" />
          <span className="hint">At least 8 characters.</span>
        </div>
        <div className="actions">
          <SubmitButton className="btn btn-primary" pendingText="Saving…">
            Save new password
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
