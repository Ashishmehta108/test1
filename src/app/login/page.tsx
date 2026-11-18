import { redirect } from "next/navigation";
import { login } from "@/app/actions";
import { AuthFrame } from "@/components/AuthFrame";
import { SubmitButton } from "@/components/SubmitButton";
import { Notice } from "@/components/ui";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({ searchParams }: { searchParams: SP }) {
  if (await getUser()) redirect("/");
  const sp = await searchParams;

  return (
    <AuthFrame>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h1>Sign in</h1>
        <p className="muted">Use the email and password your admin set up for you.</p>
      </div>
      {sp.error === "wrong" && <Notice kind="error">That email and password don&apos;t match. Check them and try again.</Notice>}
      <form action={login} className="form">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            required
            autoFocus
            autoComplete="email"
            defaultValue={typeof sp.email === "string" ? sp.email : ""}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" className="input" required autoComplete="current-password" />
        </div>
        <SubmitButton className="btn btn-primary btn-lg" pendingText="Signing in…">
          Sign in
        </SubmitButton>
      </form>
      <p className="small faint">Forgot your password? Ask your admin for a new invite link.</p>
    </AuthFrame>
  );
}
