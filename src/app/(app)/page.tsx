import Link from "next/link";
import { IconPlus, IconSearch } from "@/components/Icons";
import { When } from "@/components/When";
import { Avatar, Notice, StatusTag } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { one, q } from "@/lib/db";
import { iso, percent } from "@/lib/format";
import type { Status } from "@/lib/track";

type SP = Promise<Record<string, string | string[] | undefined>>;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "opened", label: "Opened" },
  { key: "maybe", label: "Maybe" },
  { key: "waiting", label: "Not opened" },
  { key: "draft", label: "Not sent yet" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

const FILTER_SQL: Record<FilterKey, string> = {
  all: "",
  opened: `AND status IN ('opened','clicked')`,
  maybe: `AND status = 'maybe'`,
  waiting: `AND status = 'sent'`,
  draft: `AND status = 'draft'`,
};

export default async function ResultsPage({ searchParams }: { searchParams: SP }) {
  const me = await requireUser();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  const isAdmin = me.role === "admin";
  const people = isAdmin
    ? await q<{ id: string; name: string; role: string }>(
        `SELECT id, name, role FROM users WHERE password_hash IS NOT NULL ORDER BY role = 'admin' DESC, name`,
      )
    : [];
  const requested = str("user");
  const viewing = isAdmin && people.some((p) => p.id === requested) ? requested : me.id;
  const viewingPerson = viewing === me.id ? me : people.find((p) => p.id === viewing)!;

  const filter = (FILTERS.find((f) => f.key === str("show"))?.key ?? "all") as FilterKey;
  const search = str("q").slice(0, 100);

  const totals = (await one<{
    sent: number;
    opened: number;
    clicked: number;
    maybe: number;
    waiting: number;
    drafts: number;
    total: number;
  }>(
    `SELECT CAST(COALESCE(SUM(CASE WHEN status <> 'draft' THEN 1 ELSE 0 END), 0) AS integer) AS sent,
            CAST(COALESCE(SUM(CASE WHEN status IN ('opened','clicked') THEN 1 ELSE 0 END), 0) AS integer) AS opened,
            CAST(COALESCE(SUM(CASE WHEN status = 'clicked' THEN 1 ELSE 0 END), 0) AS integer) AS clicked,
            CAST(COALESCE(SUM(CASE WHEN status = 'maybe' THEN 1 ELSE 0 END), 0) AS integer) AS maybe,
            CAST(COALESCE(SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END), 0) AS integer) AS waiting,
            CAST(COALESCE(SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END), 0) AS integer) AS drafts,
            CAST(count(*) AS integer) AS total
       FROM emails WHERE owner_id = $1`,
    [viewing],
  ))!;

  const rows = await q<{
    id: string;
    recipient_email: string;
    recipient_name: string | null;
    label: string | null;
    status: Status;
    sent_at: Date | null;
    created_at: Date;
    first_open_at: Date | null;
    open_count: number;
    click_count: number;
  }>(
    `SELECT id, recipient_email, recipient_name, label, status, sent_at, created_at,
            first_open_at, open_count, click_count
       FROM emails
      WHERE owner_id = $1 ${FILTER_SQL[filter]}
        AND ($2 = '' OR LOWER(recipient_email) LIKE '%' || LOWER($2) || '%' OR LOWER(recipient_name) LIKE '%' || LOWER($2) || '%'
             OR LOWER(label) LIKE '%' || LOWER($2) || '%')
      ORDER BY COALESCE(sent_at, created_at) DESC
      LIMIT 300`,
    [viewing, search],
  );

  const counts: Record<FilterKey, number> = {
    all: totals.total,
    opened: totals.opened,
    maybe: totals.maybe,
    waiting: totals.waiting,
    draft: totals.drafts,
  };

  const href = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    const merged = { user: viewing === me.id ? "" : viewing, show: filter === "all" ? "" : filter, q: search, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/?${s}` : "/";
  };

  const viewingSelf = viewing === me.id;
  const firstName = viewingPerson.name.split(" ")[0];

  return (
    <>
      {sp.welcome && <Notice kind="ok">Welcome! Your account is ready. Track your first email to get started.</Notice>}
      {sp.deleted && <Notice kind="ok">Deleted.</Notice>}

      <div className="page-head">
        <div className="titles">
          <h1>{viewingSelf ? "Your results" : `${firstName}'s results`}</h1>
          <p className="muted">
            {viewingSelf
              ? "Every email you've tracked, and whether it was opened."
              : `You're viewing ${viewingPerson.name}'s emails. They only see their own.`}
          </p>
        </div>
        {viewingSelf && (
          <Link href="/new" className="btn btn-primary">
            <IconPlus /> Track an email
          </Link>
        )}
      </div>

      {isAdmin && people.length > 1 && (
        <div className="people" aria-label="Choose whose results to see">
          <span className="lbl">Showing</span>
          {people.map((p) => (
            <Link
              key={p.id}
              className="person-chip"
              href={href({ user: p.id === me.id ? "" : p.id, show: "", q: "" })}
              aria-current={p.id === viewing ? "true" : undefined}
            >
              <Avatar name={p.name} admin={p.role === "admin"} />
              {p.id === me.id ? "You" : p.name}
            </Link>
          ))}
        </div>
      )}

      <section className="stats" aria-label="Summary">
        <div className="stat">
          <span className="l">Emails sent</span>
          <span className="v">{totals.sent}</span>
          <span className="sub">{totals.drafts ? `${totals.drafts} not sent yet` : " "}</span>
        </div>
        <div className="stat">
          <span className="l">
            <span className="dot" style={{ background: "var(--green)" }} /> Opened
          </span>
          <span className="v">{percent(totals.opened, totals.sent)}</span>
          <span className="sub">
            {totals.opened} of {totals.sent}
          </span>
          <div className="bar">
            <span style={{ width: `${totals.sent ? (totals.opened / totals.sent) * 100 : 0}%`, background: "var(--green)" }} />
          </div>
        </div>
        <div className="stat">
          <span className="l">
            <span className="dot" style={{ background: "var(--blue)" }} /> Clicked a link
          </span>
          <span className="v">{percent(totals.clicked, totals.sent)}</span>
          <span className="sub">
            {totals.clicked} of {totals.sent}
          </span>
          <div className="bar">
            <span style={{ width: `${totals.sent ? (totals.clicked / totals.sent) * 100 : 0}%`, background: "var(--blue)" }} />
          </div>
        </div>
        <div className="stat">
          <span className="l">
            <span className="dot" style={{ background: "#d59a2a" }} /> Maybe opened
          </span>
          <span className="v">{totals.maybe}</span>
          <span className="sub">Apple Mail or scanners, not counted</span>
        </div>
      </section>

      <section className="card">
        <div className="toolbar">
          <nav className="segmented" aria-label="Filter">
            {FILTERS.map((f) => (
              <Link key={f.key} href={href({ show: f.key === "all" ? "" : f.key })} aria-current={f.key === filter ? "true" : undefined}>
                {f.label}
                <span className="count">{counts[f.key]}</span>
              </Link>
            ))}
          </nav>
          <form className="search" action="/" role="search">
            {viewing !== me.id && <input type="hidden" name="user" value={viewing} />}
            {filter !== "all" && <input type="hidden" name="show" value={filter} />}
            <IconSearch />
            <input id="q" className="input" name="q" defaultValue={search} placeholder="Search people or subjects" aria-label="Search" />
          </form>
        </div>

        {rows.length === 0 ? (
          <div className="empty">
            <div className="illus" aria-hidden="true" />
            {totals.total === 0 ? (
              <>
                <h2>No tracked emails yet</h2>
                <p>
                  {viewingSelf
                    ? "Write your email in Gmail as usual, then come here to get an invisible tracking picture for it. It takes about ten seconds."
                    : `${viewingPerson.name} hasn't tracked any emails yet.`}
                </p>
                {viewingSelf && (
                  <Link href="/new" className="btn btn-primary">
                    <IconPlus /> Track your first email
                  </Link>
                )}
              </>
            ) : (
              <>
                <h2>Nothing matches</h2>
                <p>Try a different filter or search.</p>
                <Link href={href({ show: "", q: "" })} className="btn">
                  Show everything
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Sent to</th>
                  <th className="hide-sm">About</th>
                  <th>Status</th>
                  <th className="hide-sm">Sent</th>
                  <th>First opened</th>
                  <th className="r hide-sm">Opens</th>
                  <th className="r hide-sm">Clicks</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/emails/${r.id}`} className="row-link who">
                        <b>{r.recipient_name || r.recipient_email}</b>
                        {r.recipient_name && <span>{r.recipient_email}</span>}
                      </Link>
                    </td>
                    <td className="hide-sm muted">{r.label || <span className="faint">—</span>}</td>
                    <td>
                      <StatusTag status={r.status} />
                    </td>
                    <td className="hide-sm muted num">
                      <When at={iso(r.sent_at)} />
                    </td>
                    <td className="num">
                      <When at={iso(r.first_open_at)} />
                    </td>
                    <td className="r num hide-sm">{r.open_count || <span className="faint">0</span>}</td>
                    <td className="r num hide-sm">{r.click_count || <span className="faint">0</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
