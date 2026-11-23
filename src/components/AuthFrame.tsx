import { BrandMark } from "@/components/BrandMark";

/**
 * The signed-out screens (sign in, invite, pages that can't be found):
 * the app's name, an optional line saying what it is, then one card.
 */
export function AuthFrame({ children, about = false, foot }: { children: React.ReactNode; about?: boolean; foot?: React.ReactNode }) {
  return (
    <main className="auth">
      <div className="auth-col">
        <div className="auth-brand">
          <span className="brand">
            <BrandMark />
            Open Tracker
          </span>
          {about && <p>See when the emails you send from Gmail are opened, and which links get clicked.</p>}
        </div>
        <div className="card auth-card">{children}</div>
        {foot && <div className="auth-foot">{foot}</div>}
      </div>
    </main>
  );
}

/** The heading of a signed-out card, with one plain line under it. */
export function AuthHead({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="auth-head">
      <h1>{title}</h1>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}
