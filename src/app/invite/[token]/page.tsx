import Link from "next/link";
import { acceptInvite } from "@/app/actions";
import { AuthFrame } from "@/components/AuthFrame";
import { Notice } from "@/components/ui";
import { iso, one } from "@/lib/db";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

const ERRORS: Record<string, string> = {
  short: "Your password needs at least 8 characters.",
  match: "The two passwords don't match.",
  expired: "This invite link has expired or was already used. Ask your admin for a new one.",
};

export default async function InvitePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: SP }) {
  const { token } = await params;
  const sp = await searchParams;
  const invite = await one<{ name: string; email: string }>(
    `SELECT name, email FROM users WHERE invite_token = $1 AND invite_expires > $2 AND active`,
    [token, iso()],
  );
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : undefined;

  if (!invite) {
    return (
      <AuthFrame>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h1>This link doesn&apos;t work any more</h1>
          <p className="muted">Invite links work once and expire after 3 days. Ask your admin to send you a new one.</p>
        </div>
        <Link href="/login" className="btn">
          Go to sign in
        </Link>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h1>Welcome, {invite.name.split(" ")[0]}</h1>
        <p className="muted">Choose a password to finish setting up your account for {invite.email}.</p>
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      <form action={acceptInvite} className="form">
        <input type="hidden" name="token" value={token} />
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" className="input" required minLength={8} autoFocus autoComplete="new-password" />
          <span className="hint">At least 8 characters.</span>
        </div>
        <div className="field">
          <label htmlFor="confirm">Type it again</label>
          <input id="confirm" name="confirm" type="password" className="input" required minLength={8} autoComplete="new-password" />
        </div>
        <button type="submit" className="btn btn-primary btn-lg">
          Create my account
        </button>
      </form>
    </AuthFrame>
  );
}
