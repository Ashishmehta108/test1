import bcrypt from "bcryptjs";
import { readMigrationFiles } from "drizzle-orm/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import path from "node:path";
import { newId } from "../lib/ids";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
type Migrate = (db: never, config: { migrationsFolder: string }) => Promise<void>;

/**
 * One Drizzle handle over three Postgres drivers:
 *  - Neon (Postgres over HTTP) when DATABASE_URL points at neon.tech, used on Vercel.
 *  - A normal Postgres server (Aiven, Supabase, RDS, ...) for any other DATABASE_URL.
 *  - PGlite (Postgres compiled to WASM, stored in ./.data/pglite) when DATABASE_URL is empty,
 *    so nothing needs installing to try the app.
 * All three are Postgres, so the rest of the app doesn't care which one runs.
 */
async function connect(): Promise<{ db: Db; migrate: Migrate }> {
  const url = process.env.DATABASE_URL?.trim();

  if (url && !/\.neon\.tech/.test(url)) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const clean = new URL(url);
    const wantsSsl = clean.searchParams.get("sslmode") !== "disable";
    clean.searchParams.delete("sslmode"); // ssl is set explicitly below
    // Some hosts (Aiven) use their own certificate authority: paste its certificate into DATABASE_CA.
    const ca = process.env.DATABASE_CA?.trim().replace(/\\n/g, "\n");
    const base = { connectionString: clean.toString(), ssl: wantsSsl ? (ca ? { ca } : true) : false };
    // Hosts quietly drop connections that sit unused (and a laptop going to sleep does too).
    // A question sent down a dropped connection used to wait forever, so the page never loaded.
    // Now: unused connections are let go after 10s and every connection is replaced after
    // 5 minutes, reaching the database gives up after 10s and any one question after 10s,
    // so the worst case is a short wait and a "try again" message instead of a hang.
    const pool = new Pool({
      ...base,
      max: 8,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
      idleTimeoutMillis: 10_000,
      maxLifetimeSeconds: 300,
      connectionTimeoutMillis: 10_000,
      statement_timeout: 8_000,
      query_timeout: 10_000,
    });
    // A connection the host closes while idle must not take the whole app down.
    pool.on("error", (err) => console.error("[tracker] database connection dropped", err.message));
    // Database upgrades can take longer than a normal question, so they get their own
    // single connection without those limits, closed again straight after.
    const migrateOwn: Migrate = async (_db, config) => {
      const own = new Pool({ ...base, max: 1, connectionTimeoutMillis: 15_000 });
      own.on("error", (err) => console.error("[tracker] database connection dropped", err.message));
      try {
        await (migrate as unknown as Migrate)(drizzle(own, { schema }) as never, config);
      } finally {
        await own.end();
      }
    };
    return { db: drizzle(pool, { schema }), migrate: migrateOwn };
  }

  if (url) {
    const { neon, neonConfig } = await import("@neondatabase/serverless");
    // By default the driver asks an "api." copy of the database's address, which some home
    // routers refuse to look up (the page then fails with "fetch failed"). The database's own
    // address answers the same requests, so use that one.
    neonConfig.fetchEndpoint = (host) => `https://${host}/sql`;
    const { drizzle } = await import("drizzle-orm/neon-http");
    const { migrate } = await import("drizzle-orm/neon-http/migrator");
    return { db: drizzle(neon(url), { schema }), migrate: migrate as unknown as Migrate };
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const { mkdirSync } = await import("node:fs");
  const dir = process.env.PGLITE_DIR || "./.data/pglite";
  mkdirSync(dir, { recursive: true });
  return { db: drizzle(new PGlite(dir), { schema }), migrate: migrate as unknown as Migrate };
}

/** The drivers return either a list of rows or an object holding them. */
function rowsOf<T>(result: unknown): T[] {
  return Array.isArray(result) ? (result as T[]) : ((result as { rows?: T[] }).rows ?? []);
}

/**
 * Brings the database up to date. Costs a single quick question when nothing is needed.
 * Returns whether any user exists yet (so the first admin can be created).
 */
async function ensureSchema(db: Db, migrate: Migrate): Promise<{ hasUsers: boolean }> {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  const migrations = readMigrationFiles({ migrationsFolder });
  const latest = migrations[migrations.length - 1].folderMillis;

  try {
    const [row] = rowsOf<{ m: string | number | null; has_users: boolean }>(
      await db.execute(
        sql`SELECT (SELECT max(created_at) FROM drizzle.__drizzle_migrations) AS m, EXISTS (SELECT 1 FROM users) AS has_users`,
      ),
    );
    if (Number(row?.m) >= latest) return { hasUsers: Boolean(row?.has_users) };
  } catch {
    // First start on this database: the tables below don't exist yet.
  }

  // A database made before Drizzle (same tables, created by hand, even from an older version
  // of the app): note that the first migration is already in place instead of creating it again.
  // The next migration brings an older layout up to date. If the last two indexes below are
  // missing, an earlier first start was cut short, so the first migration simply runs again.
  const baseline = migrations[0];
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS drizzle`);
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)`,
  );
  await db.execute(sql`
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
    SELECT ${baseline.hash}::text, ${baseline.folderMillis}::bigint
     WHERE to_regclass('public.users') IS NOT NULL
       AND to_regclass('public.sessions') IS NOT NULL
       AND to_regclass('public.emails') IS NOT NULL
       AND to_regclass('public.links') IS NOT NULL
       AND to_regclass('public.open_events') IS NOT NULL
       AND to_regclass('public.click_events') IS NOT NULL
       AND to_regclass('public.click_events_email_idx') IS NOT NULL
       AND to_regclass('public.open_events_email_idx') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations)`);

  await migrate(db as never, { migrationsFolder });
  const [{ has_users }] = rowsOf<{ has_users: boolean }>(await db.execute(sql`SELECT EXISTS (SELECT 1 FROM users) AS has_users`));
  return { hasUsers: Boolean(has_users) };
}

async function seedAdmin(db: Db) {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn("[tracker] No users yet. Set ADMIN_EMAIL and ADMIN_PASSWORD to create the first admin.");
    return;
  }
  await db
    .insert(schema.users)
    .values({
      id: newId(),
      email,
      name: process.env.ADMIN_NAME?.trim() || "Admin",
      passwordHash: await bcrypt.hash(password, 10),
      role: "admin",
    })
    .onConflictDoNothing({ target: schema.users.email });
  console.log(`[tracker] Created first admin: ${email}`);
}

async function init(): Promise<Db> {
  const { db, migrate } = await connect();
  const { hasUsers } = await ensureSchema(db, migrate);
  if (!hasUsers) await seedAdmin(db);
  return db;
}

// Reuse one connection per server process (and across hot reloads in dev).
const g = globalThis as unknown as { __trackerDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!g.__trackerDb) {
    g.__trackerDb = init().catch((err) => {
      g.__trackerDb = undefined;
      throw err;
    });
  }
  return g.__trackerDb;
}

/** A moment as text the database reads as a time, the same on every driver. */
export const at = (d: Date) => sql`${d.toISOString()}::timestamptz`;
