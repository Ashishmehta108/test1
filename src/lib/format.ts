import type { Status } from "./track";

export const STATUS_LABEL: Record<Status, string> = {
  draft: "Not sent yet",
  sent: "Not opened yet",
  maybe: "Maybe opened",
  opened: "Opened",
  clicked: "Clicked",
};

export const STATUS_TAG: Record<Status, string> = {
  draft: "t-draft",
  sent: "t-none",
  maybe: "t-maybe",
  opened: "t-open",
  clicked: "t-click",
};

export function iso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function percent(part: number, whole: number): string {
  if (!whole) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

/** A short, human name for the app or device behind a user agent. */
export function deviceName(ua: string | null | undefined): string {
  if (!ua) return "Unknown device";
  if (/GoogleImageProxy/i.test(ua)) return "Gmail";
  if (ua.trim() === "Mozilla/5.0") return "Apple Mail (automatic)";
  if (/Outlook|ms-office|Microsoft Office/i.test(ua)) return "Outlook";
  if (/YahooMailProxy/i.test(ua)) return "Yahoo Mail";
  if (/iPhone|iPad/i.test(ua)) return "iPhone or iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  if (/bot|crawler|scanner|proofpoint|mimecast|barracuda/i.test(ua)) return "Security scanner";
  return "Unknown device";
}

export function normaliseUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    return u.hostname.includes(".") ? u.toString() : null;
  } catch {
    return null;
  }
}

export function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
