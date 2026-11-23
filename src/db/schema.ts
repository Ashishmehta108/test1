import { sql } from "drizzle-orm";
import { bigserial, boolean, check, index, integer, pgTable, serial, text, timestamp, unique, uniqueIndex } from "drizzle-orm/pg-core";

export const ROLES = ["admin", "user"] as const;
export const STATUSES = ["draft", "sent", "maybe", "opened", "clicked"] as const;
export const EVENT_KINDS = ["real", "maybe", "ignored"] as const;

export type Role = (typeof ROLES)[number];
export type Status = (typeof STATUSES)[number];
export type EventKind = (typeof EVENT_KINDS)[number];

// Every time is saved as "timestamp with time zone": Postgres keeps it as an exact moment in UTC,
// whatever the server's own timezone is. The app writes JavaScript dates (UTC) or the database's now().
// Nothing converts to local time on the server. Each person's browser does that (components/When.tsx).
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const list = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(","));

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    passwordHash: text("password_hash"),
    role: text("role", { enum: ROLES }).notNull().default("user"),
    active: boolean("active").notNull().default(true),
    inviteToken: text("invite_token").unique(),
    inviteExpires: ts("invite_expires"),
    lastIp: text("last_ip"),
    lastIpAt: ts("last_ip_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [check("users_role_check", sql`${t.role} in (${list(ROLES)})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: ts("expires_at").notNull(),
  },
  // Signing someone out everywhere, and clearing out their old sessions, looks sessions up by person.
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const emails = pgTable(
  "emails",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id),
    token: text("token").notNull().unique(),
    recipientEmail: text("recipient_email").notNull(),
    recipientName: text("recipient_name"),
    label: text("label"),
    status: text("status", { enum: STATUSES }).notNull().default("draft"),
    createdAt: ts("created_at").notNull().defaultNow(),
    sentAt: ts("sent_at"),
    firstOpenAt: ts("first_open_at"),
    lastOpenAt: ts("last_open_at"),
    openCount: integer("open_count").notNull().default(0),
    maybeCount: integer("maybe_count").notNull().default(0),
    clickCount: integer("click_count").notNull().default(0),
    shareToken: text("share_token"),
    // Private notes the sender keeps about this email (markdown text). Never shown on a shared link.
    notes: text("notes"),
  },
  (t) => [
    check("emails_status_check", sql`${t.status} in (${list(STATUSES)})`),
    // The results list: one person's emails, newest first (by when it was sent, else when it was made).
    index("emails_owner_recent_idx").on(t.ownerId, sql`coalesce(${t.sentAt}, ${t.createdAt}) desc`),
    // The totals and the filter tabs: one person's emails grouped by status.
    index("emails_owner_status_idx").on(t.ownerId, t.status),
    // Opening a shared link. Only emails that are actually shared take up room in the index.
    uniqueIndex("emails_share_idx").on(t.shareToken).where(sql`${t.shareToken} is not null`),
  ],
);

export const links = pgTable(
  "links",
  {
    id: serial("id").primaryKey(),
    emailId: text("email_id").notNull().references(() => emails.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    url: text("url").notNull(),
  },
  (t) => [unique("links_email_id_position_key").on(t.emailId, t.position)],
);

export const openEvents = pgTable(
  "open_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    emailId: text("email_id").notNull().references(() => emails.id, { onDelete: "cascade" }),
    at: ts("at").notNull().defaultNow(),
    userAgent: text("user_agent"),
    kind: text("kind", { enum: EVENT_KINDS }).notNull(),
    reason: text("reason"),
  },
  (t) => [
    check("open_events_kind_check", sql`${t.kind} in (${list(EVENT_KINDS)})`),
    // Counting an email's opens and finding its first and last one reads only this index.
    index("open_events_email_kind_idx").on(t.emailId, t.kind, t.at),
  ],
);

export const clickEvents = pgTable(
  "click_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    emailId: text("email_id").notNull().references(() => emails.id, { onDelete: "cascade" }),
    linkId: integer("link_id").references(() => links.id, { onDelete: "set null" }),
    at: ts("at").notNull().defaultNow(),
    userAgent: text("user_agent"),
    kind: text("kind", { enum: EVENT_KINDS }).notNull(),
    reason: text("reason"),
  },
  (t) => [
    check("click_events_kind_check", sql`${t.kind} in (${list(EVENT_KINDS)})`),
    index("click_events_email_kind_idx").on(t.emailId, t.kind, t.at),
    // Clicks per link, and the database's own clean-up when a link is deleted.
    index("click_events_link_idx").on(t.linkId, t.kind),
  ],
);
