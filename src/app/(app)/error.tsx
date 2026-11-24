"use client";

import { useEffect } from "react";

/** Shown when a page couldn't load (usually the database was slow for a moment). */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[tracker] page could not load", error);
  }, [error]);

  return (
    <section className="card empty" role="alert">
      <h2>This page didn&apos;t load</h2>
      <p className="muted">The connection was slow for a moment. Nothing was lost.</p>
      <button type="button" className="btn btn-primary" onClick={() => reset()}>
        Try again
      </button>
    </section>
  );
}
