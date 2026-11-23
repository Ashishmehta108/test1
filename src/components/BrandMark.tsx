/**
 * The app's mark: a bright blue tile with an envelope and a small green dot for "opened".
 * Its colours come from the game's palette (see .bm-* in shell.css), so it follows light and dark.
 */
export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 24 24" aria-hidden="true">
      <rect className="bm-tile" width="24" height="24" rx="7" />
      <rect className="bm-line" x="4.8" y="8.2" width="14.4" height="10.2" rx="2.3" />
      <path className="bm-line" d="M5.5 9.7 12 14.2l6.5-4.5" />
      <circle className="bm-dot" cx="17.7" cy="7.3" r="3.1" />
    </svg>
  );
}
