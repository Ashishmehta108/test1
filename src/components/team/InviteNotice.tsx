import Link from "next/link";
import { CopyTextButton } from "@/components/Copy";

/** Shown after inviting someone (or choosing "Show invite link"): the link to send them, ready to copy. */
export function InviteNotice({ name, url }: { name: string; url: string }) {
  return (
    <section className="notice notice-info invite-notice" role="status" aria-label="Invite link">
      <div className="invite-body">
        <div className="invite-top">
          <h2 className="card-title">Send this link to {name}</h2>
          <Link href="/team" className="btn btn-quiet btn-sm">
            Hide
          </Link>
        </div>
        <p>Share it on WhatsApp, Slack or email. They open it and choose a password. It works once and expires in 3 days.</p>
        <div className="invite-link">
          <div className="code-line">{url}</div>
          <CopyTextButton text={url} label="Copy invite link" />
        </div>
      </div>
    </section>
  );
}
