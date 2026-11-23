import { and, asc, desc, eq, gte, ne, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { inviteUser } from "@/app/actions";
import { Legend, pct } from "@/components/charts";
import { SubmitButton } from "@/components/SubmitButton";
import { InviteNotice } from "@/components/team/InviteNotice";
import { MemberRow } from "@/components/team/MemberRow";
import { TEAM_LEGEND } from "@/components/team/outcomes";
import { Notice, PageHead, Stat, Stats } from "@/components/ui";
import { getDb } from "@/db";
import { emails, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { baseUrl } from "@/lib/request";

type SP = Promise<Record<string, string | string[] | undefined>>;

const ERRORS: Record<string, string> = {
  name: "Add their name so you can tell people apart.",
  email: "That email address doesn't look right.",
  exists: "Someone with that email is already on the team.",
  self: "You can't pause or delete your own account.",
};

export default async function TeamPage({ searchParams }: { searchParams: SP }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const v = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const base = baseUrl(await headers());

  const db = await getDb();
  const monthAgo = new Date(Date.now() - 30 * 86_400_000);

  const [members, [month]] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        active: users.active,
        hasPassword: sql<boolean>`${users.passwordHash} is not null`,
        inviteToken: users.inviteToken,
        inviteValid: sql<boolean>`coalesce(${users.inviteExpires} > now(), false)`,
        sent: sql<number>`count(${emails.id}) filter (where ${emails.status} <> 'draft')`.mapWith(Number),
        opened: sql<number>`count(${emails.id}) filter (where ${emails.status} in ('opened','clicked'))`.mapWith(Number),
        clicked: sql<number>`count(${emails.id}) filter (where ${emails.status} = 'clicked')`.mapWith(Number),
        justOpened: sql<number>`count(${emails.id}) filter (where ${emails.status} = 'opened')`.mapWith(Number),
        maybe: sql<number>`count(${emails.id}) filter (where ${emails.status} = 'maybe')`.mapWith(Number),
        waiting: sql<number>`count(${emails.id}) filter (where ${emails.status} = 'sent')`.mapWith(Number),
      })
      .from(users)
      .leftJoin(emails, eq(emails.ownerId, users.id))
      .groupBy(users.id)
      .orderBy(desc(sql`${users.role} = 'admin'`), asc(users.createdAt)),
    // The whole team's last 30 days, for the numbers at the top.
    db
      .select({
        sent: sql<number>`count(*)`.mapWith(Number),
        opened: sql<number>`count(*) filter (where ${emails.status} in ('opened','clicked'))`.mapWith(Number),
      })
      .from(emails)
      .where(and(ne(emails.status, "draft"), gte(emails.sentAt, monthAgo))),
  ]);

  const invited = members.find((m) => m.id === v("invited") && m.inviteToken);
  const error = ERRORS[v("error")];

  const paused = members.filter((m) => !m.active).length;
  const waitingToJoin = members.filter((m) => !m.hasPassword && m.active).length;
  const peopleSub =
    members.length === 1
      ? "Just you so far"
      : [paused > 0 && `${paused} paused`, waitingToJoin > 0 && `${waitingToJoin} waiting to join`].filter(Boolean).join(" · ") || "Everyone has joined";

  return (
    <>
      <PageHead title="Team" sub="Everyone sees only their own emails, plus the team leaderboard. You can open anyone's results from here." />

      {error && <Notice kind="error">{error}</Notice>}
      {sp.removed && <Notice kind="ok">Removed. Their tracked emails were deleted too.</Notice>}
      {invited && <InviteNotice name={invited.name} url={`${base}/invite/${invited.inviteToken}`} />}

      <div className="team-stats">
        <Stats cols={3} label="The team in numbers">
          <Stat label="People" value={members.length} sub={peopleSub} />
          <Stat label="Emails sent" value={month.sent} sub={month.sent ? "in the last 30 days" : "nothing sent in the last 30 days"} />
          <Stat
            label="Team open rate"
            value={pct(month.opened, month.sent)}
            sub={month.sent ? `${month.opened} of ${month.sent} opened` : undefined}
          />
        </Stats>
      </div>

      <div className="team-area">
        <div className="team-grid">
          <section className="card members" aria-label="Team members">
            <div className="card-head"><h2>People</h2>
              <Legend items={TEAM_LEGEND} />
            </div>
            <ul className="member-list">
              {members.map((m) => (
                <MemberRow key={m.id} m={m} isMe={m.id === me.id} />
              ))}
            </ul>
            <p className="quiet-note">
              {members.length === 1 ? "It's just you so far. Add someone with the form, and they'll get their own results. " : ""}
              The numbers on each line count every email that person has sent so far.
            </p>
          </section>

          <section className="card invite-card" aria-label="Add someone">
            <div className="card-head"><h2>Add someone</h2></div>
            <form action={inviteUser} className="form invite-form">
              <p className="small muted invite-lead">You&apos;ll get a link to send them.</p>
              <div className="field">
                <label htmlFor="invite-name">Name</label>
                <input
                  id="invite-name"
                  name="name"
                  className="input"
                  required
                  placeholder="Riya Kapoor"
                  defaultValue={v("name")}
                  aria-invalid={v("error") === "name" || undefined}
                />
              </div>
              <div className="field">
                <label htmlFor="invite-email">Email</label>
                <input
                  id="invite-email"
                  name="email"
                  type="email"
                  className="input"
                  required
                  placeholder="riya@yourcompany.com"
                  defaultValue={v("email")}
                  aria-invalid={v("error") === "email" || v("error") === "exists" || undefined}
                />
              </div>
              <SubmitButton className="btn btn-primary" pendingText="Creating…">
                Create invite link
              </SubmitButton>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
