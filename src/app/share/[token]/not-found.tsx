export default function ShareNotFound() {
  return (
    <main className="main" style={{ maxWidth: 720 }}>
      <div className="card empty">
        <div className="illus" aria-hidden="true" />
        <h2>This link isn&apos;t available any more.</h2>
        <p>The sender may have turned it off or made a new one.</p>
      </div>
    </main>
  );
}
