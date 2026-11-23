import { and, eq, gt } from "drizzle-orm";
import Link from "next/link";
import { acceptInvite } from "@/app/actions";
import { AuthFrame, AuthHead } from "@/components/AuthFrame";
import { SubmitButton } from "@/components/SubmitButton";
import { Notice } from "@/components/ui";
import { getDb } from "@/db";
import { users } from "@/db/schema";

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
  const db = await getDb();
  const [invite] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(and(eq(users.inviteToken, token), gt(users.inviteExpires, new Date()), eq(users.active, true)))
    .limit(1);
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : undefined;

  if (!invite) {
    return (
      <AuthFrame>
        <AuthHead title={"This link doesn't work any more"}>
          Invite links work once and expire after 3 days. Ask your admin to send you a new one.
        </AuthHead>
        <Link href="/login" className="btn">
          Go to sign in
        </Link>
      </AuthFrame>
    );
  }

  const badPassword = sp.error === "short" || sp.error === "match";

  return (
    <AuthFrame about>
      <AuthHead title={`Welcome, ${invite.name.split(" ")[0]}`}>
        Choose a password to finish setting up your account for <b className="auth-email">{invite.email}</b>.
      </AuthHead>
      {error && <Notice kind="error">{error}</Notice>}
      <form action={acceptInvite} className="form">
        <input type="hidden" name="token" value={token} />
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            className="input"
            required
            minLength={8}
            autoFocus
            autoComplete="new-password"
            aria-invalid={badPassword || undefined}
            aria-describedby="password-hint"
          />
          <span className="hint" id="password-hint">At least 8 characters.</span>
        </div>
        <div className="field">
          <label htmlFor="confirm">Type it again</label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            className="input"
            required
            minLength={8}
            autoComplete="new-password"
            aria-invalid={sp.error === "match" || undefined}
          />
        </div>
        <SubmitButton className="btn btn-primary btn-lg" pendingText="Creating account…">
          Create my account
        </SubmitButton>
      </form>
    </AuthFrame>
  );
}
