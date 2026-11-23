import { redirect } from "next/navigation";
import { login } from "@/app/actions";
import { AuthFrame, AuthHead } from "@/components/AuthFrame";
import { SubmitButton } from "@/components/SubmitButton";
import { Notice } from "@/components/ui";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({ searchParams }: { searchParams: SP }) {
  if (await getUser()) redirect("/");
  const sp = await searchParams;

  const wrong = sp.error === "wrong";

  return (
    <AuthFrame about foot="Forgot your password? Ask your admin for a new invite link.">
      <AuthHead title="Sign in">Use the email and password your admin set up for you.</AuthHead>
      {wrong && <Notice kind="error">That email and password don&apos;t match. Check them and try again.</Notice>}
      <form action={login} className="form">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            required
            autoFocus={!wrong}
            autoComplete="email"
            aria-invalid={wrong || undefined}
            defaultValue={typeof sp.email === "string" ? sp.email : ""}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            className="input"
            required
            autoFocus={wrong}
            autoComplete="current-password"
            aria-invalid={wrong || undefined}
          />
        </div>
        <SubmitButton className="btn btn-primary btn-lg" pendingText="Signing in…">
          Sign in
        </SubmitButton>
      </form>
    </AuthFrame>
  );
}
