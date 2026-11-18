/** Two-column frame for sign-in screens: a quiet example of results on the left, the form on the right. */
export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth-side">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Open Tracker
        </div>
        <div className="pitch">
          <h1>Know who opened your email.</h1>
          <p className="muted">
            Send from Gmail like you always do. Add one invisible picture, and see when each person opens it or clicks your links.
          </p>
        </div>
        <div className="auth-sample" aria-label="Example">
          <div>
            <span>priya@acme.com</span>
            <span className="tag t-click">Clicked</span>
          </div>
          <div>
            <span>james@northwind.co</span>
            <span className="tag t-open">Opened</span>
          </div>
          <div>
            <span>omar@fieldstone.com</span>
            <span className="tag t-none">Not opened yet</span>
          </div>
        </div>
      </aside>
      <main className="auth-form">
        <div className="inner">{children}</div>
      </main>
    </div>
  );
}
