import bcrypt from "bcryptjs";
import { newId } from "./ids";

/**
 * One tiny interface over two Postgres drivers:
 *  - Neon (Postgres over HTTP) when DATABASE_URL is set — used on Vercel.
 *  - PGlite (Postgres compiled to WASM, stored in ./.data/pglite) otherwise — used
 *    locally, so nothing needs installing to try the app.
 * Both are Postgres, so the rest of the app doesn't care which one runs.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
interface Db {
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
  /** Run several statements (no parameters) in as few trips to the database as possible. */
  exec(statements: string[]): Promise<void>;
}

/** A time as ISO text, optionally shifted by some milliseconds. Works in both databases. */
export function iso(offsetMs = 0): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
     id             text PRIMARY KEY,
     email          text NOT NULL UNIQUE,
     name           text NOT NULL,
     password_hash  text,
     role           text NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
     active         boolean NOT NULL DEFAULT true,
     invite_token   text UNIQUE,
     invite_expires timestamptz,
     last_ip        text,
     last_ip_at     timestamptz,
     created_at     timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS sessions (
     token      text PRIMARY KEY,
     user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created_at timestamptz NOT NULL DEFAULT now(),
     expires_at timestamptz NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS emails (
     id              text PRIMARY KEY,
     owner_id        text NOT NULL REFERENCES users(id),
     token           text NOT NULL UNIQUE,
     recipient_email text NOT NULL,
     recipient_name  text,
     label           text,
     status          text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','sent','maybe','opened','clicked')),
     created_at      timestamptz NOT NULL DEFAULT now(),
     sent_at         timestamptz,
     first_open_at   timestamptz,
     last_open_at    timestamptz,
     open_count      integer NOT NULL DEFAULT 0,
     maybe_count     integer NOT NULL DEFAULT 0,
     click_count     integer NOT NULL DEFAULT 0
   )`,
  `CREATE INDEX IF NOT EXISTS emails_owner_idx ON emails (owner_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS links (
     id       serial PRIMARY KEY,
     email_id text NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
     position integer NOT NULL,
     url      text NOT NULL,
     UNIQUE (email_id, position)
   )`,
  `CREATE TABLE IF NOT EXISTS open_events (
     id         bigserial PRIMARY KEY,
     email_id   text NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
     at         timestamptz NOT NULL DEFAULT now(),
     ip         text,
     user_agent text,
     kind       text NOT NULL CHECK (kind IN ('real','maybe','ignored')),
     reason     text
   )`,
  `CREATE INDEX IF NOT EXISTS open_events_email_idx ON open_events (email_id, at)`,
  `CREATE TABLE IF NOT EXISTS click_events (
     id         bigserial PRIMARY KEY,
     email_id   text NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
     link_id    integer REFERENCES links(id) ON DELETE SET NULL,
     at         timestamptz NOT NULL DEFAULT now(),
     ip         text,
     user_agent text,
     kind       text NOT NULL CHECK (kind IN ('real','maybe','ignored')),
     reason     text
   )`,
  `CREATE INDEX IF NOT EXISTS click_events_email_idx ON click_events (email_id, at)`,
  `ALTER TABLE emails ADD COLUMN IF NOT EXISTS share_token text`,
  `CREATE UNIQUE INDEX IF NOT EXISTS emails_share_idx ON emails (share_token)`,
];

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL?.trim();
  if (url && !/\.neon\.tech/.test(url)) {
    // Any ordinary Postgres server (Aiven, Supabase, RDS, ...) over a normal, verified connection.
    // Some hosts (Aiven) use their own certificate authority: paste its certificate into DATABASE_CA.
    const { Pool } = await import("pg");
    const clean = new URL(url);
    const wantsSsl = clean.searchParams.get("sslmode") !== "disable";
    clean.searchParams.delete("sslmode"); // ssl is set explicitly below
    const ca = process.env.DATABASE_CA?.trim().replace(/\\n/g, "\n");
    const pool = new Pool({
      connectionString: clean.toString(),
      ssl: wantsSsl ? (ca ? { ca } : true) : false,
      max: 3,
      keepAlive: true,
    });
    return {
      query: async (text, params = []) => (await pool.query(text, params as never[])).rows as never,
      // One trip for the whole list (the simple query protocol accepts many statements).
      exec: async (statements) => {
        await pool.query(statements.join(";\n"));
      },
    };
  }
  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    return {
      query: async (text, params = []) => (await sql.query(text, params)) as never,
      exec: async (statements) => {
        for (const s of statements) await sql.query(s);
      },
    };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { mkdirSync } = await import("node:fs");
  const dir = process.env.PGLITE_DIR || "./.data/pglite";
  mkdirSync(dir, { recursive: true });
  const pg = new PGlite(dir);
  return {
    query: async (text, params = []) => (await pg.query(text, params)).rows as never,
    exec: async (statements) => {
      await pg.exec(statements.join(";\n"));
    },
  };
}

async function seedAdmin(db: Db) {
  const [{ n }] = await db.query<{ n: number }>(`SELECT CAST(count(*) AS integer) AS n FROM users`);
  if (n > 0) return;
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn("[tracker] No users yet. Set ADMIN_EMAIL and ADMIN_PASSWORD to create the first admin.");
    return;
  }
  await db.query(
    `INSERT INTO users (id, email, name, password_hash, role) VALUES ($1,$2,$3,$4,'admin')
     ON CONFLICT (email) DO NOTHING`,
    [newId(), email, process.env.ADMIN_NAME?.trim() || "Admin", await bcrypt.hash(password, 10)],
  );
  console.log(`[tracker] Created first admin: ${email}`);
}

async function init(): Promise<Db> {
  const db = await connect();
  await db.exec(SCHEMA);
  await seedAdmin(db);
  return db;
}

// Reuse one connection per server process (and across hot reloads in dev).
const g = globalThis as unknown as { __trackerDb?: Promise<Db> };

function getDb(): Promise<Db> {
  if (!g.__trackerDb) {
    g.__trackerDb = init().catch((err) => {
      g.__trackerDb = undefined;
      throw err;
    });
  }
  return g.__trackerDb;
}

export async function q<T = Row>(text: string, params?: unknown[]): Promise<T[]> {
  return (await getDb()).query<T>(text, params);
}

export async function one<T = Row>(text: string, params?: unknown[]): Promise<T | undefined> {
  return (await q<T>(text, params))[0];
}
