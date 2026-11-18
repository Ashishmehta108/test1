import { after, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { clientIp } from "@/lib/request";
import { PIXEL, recordOpen } from "@/lib/track";

export const dynamic = "force-dynamic";

// GET /o/<token>.gif — the invisible tracking picture.
export async function GET(req: NextRequest, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const token = file.replace(/\.gif$/i, "");

  const hit = {
    ip: clientIp(req.headers),
    userAgent: req.headers.get("user-agent") ?? "",
    sessionToken: req.cookies.get(SESSION_COOKIE)?.value,
  };

  // Answer immediately; record the open after the picture has been sent.
  if (/^[0-9A-Za-z]{22}$/.test(token)) {
    after(() => recordOpen(token, hit).catch((err) => console.error("[tracker] open failed", err)));
  }

  return new Response(new Uint8Array(PIXEL), {
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(PIXEL.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, private, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
