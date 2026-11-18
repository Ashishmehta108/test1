type HeaderSource = { get(name: string): string | null };

export function clientIp(h: HeaderSource): string | null {
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim() || null;
  return h.get("x-real-ip") || null;
}

/** Public address the tracking picture and links should point to. */
export function baseUrl(h: HeaderSource): string {
  const configured = process.env.TRACK_BASE_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
