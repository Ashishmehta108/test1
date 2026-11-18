import { after, NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { clientIp } from "@/lib/request";
import { findLink, recordClick } from "@/lib/track";

export const dynamic = "force-dynamic";

// GET /c/<token>/<n> — a tracked link. Records the click, then forwards to the real page.
export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string; link: string }> }) {
  const { token, link } = await ctx.params;
  const position = Number.parseInt(link, 10);

  // Only ever redirect to a URL the sender saved, so this can't be abused as an open redirect.
  const target = Number.isFinite(position) ? await findLink(token, position) : undefined;
  if (!target) {
    return new NextResponse("This link is no longer available.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const hit = {
    ip: clientIp(req.headers),
    userAgent: req.headers.get("user-agent") ?? "",
    sessionToken: req.cookies.get(SESSION_COOKIE)?.value,
  };
  after(() =>
    recordClick(token, target.link_id, hit).catch((err) => console.error("[tracker] click failed", err)),
  );

  return NextResponse.redirect(target.url, { status: 302, headers: { "Cache-Control": "no-store" } });
}
