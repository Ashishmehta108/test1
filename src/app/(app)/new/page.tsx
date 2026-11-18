import Link from "next/link";
import { createEmail } from "@/app/actions";
import { IconBack } from "@/components/Icons";
import { SubmitButton } from "@/components/SubmitButton";
import { Notice } from "@/components/ui";
import { requireUser } from "@/lib/auth";

type SP = Promise<Record<string, string | string[] | undefined>>;

const ERRORS: Record<string, string> = {
  email: "That email address doesn't look right. Check it and try again.",
  link: "One of the links isn't a web address. Put each link on its own line, like yourcompany.com/pricing.",
};

export default async function NewEmailPage({ searchParams }: { searchParams: SP }) {
  await requireUser();
  const sp = await searchParams;
  const v = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const error = ERRORS[v("error")];

  return (
    <div style={{ maxWidth: 640, width: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="page-head">
        <div className="titles">
          <Link href="/" className="crumb">
            <IconBack /> Results
          </Link>
          <h1>Track an email</h1>
          <p className="muted">Tell us who you&apos;re emailing. You&apos;ll get an invisible picture to paste into your Gmail message.</p>
        </div>
      </div>

      {error && <Notice kind="error">{error}</Notice>}

      <form action={createEmail} className="card card-pad form">
        <div className="row-2">
          <div className="field">
            <label htmlFor="recipient">Their email address</label>
            <input
              id="recipient"
              name="recipient"
              type="email"
              className="input"
              required
              autoFocus
              autoComplete="off"
              placeholder="priya@acme.com"
              defaultValue={v("recipient")}
            />
          </div>
          <div className="field">
            <label htmlFor="name">
              Their name <span className="faint">(optional)</span>
            </label>
            <input id="name" name="name" className="input" placeholder="Priya Shah" defaultValue={v("name")} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="label">
            What&apos;s the email about? <span className="faint">(optional)</span>
          </label>
          <input id="label" name="label" className="input" placeholder="Q4 offer" defaultValue={v("label")} />
          <span className="hint">Use the same words for similar emails so you can search for them later.</span>
        </div>

        <div className="field">
          <label htmlFor="links">
            Links in your email <span className="faint">(optional)</span>
          </label>
          <textarea
            id="links"
            name="links"
            className="input"
            placeholder={"yourcompany.com/pricing\nyourcompany.com/book-a-call"}
            defaultValue={v("links")}
          />
          <span className="hint">One per line. You&apos;ll get a tracked version of each, so you can see who clicked.</span>
        </div>

        <div className="actions">
          <SubmitButton className="btn btn-primary btn-lg" pendingText="Creating…">
            Create tracking picture
          </SubmitButton>
          <Link href="/" className="btn btn-quiet">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
