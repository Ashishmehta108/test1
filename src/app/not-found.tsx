import Link from "next/link";

export default function NotFound() {
  return (
    <main className="main">
      <div className="card empty">
        <div className="illus" aria-hidden="true" />
        <h2>We couldn&apos;t find that page</h2>
        <p>It may have been deleted, or it belongs to someone else on the team.</p>
        <Link href="/" className="btn">
          Back to results
        </Link>
      </div>
    </main>
  );
}
