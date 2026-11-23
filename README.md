# Open Tracker

See who opened the emails you send from Gmail, and who clicked your links.
You keep writing and sending from Gmail. The tracker only gives you an invisible
picture (and tracked links) to paste in, then records when they load.

## How to use it (every email)

1. Write your email in Gmail.
2. In Open Tracker, click **Track an email**, type who it's to, and click **Create tracking picture**.
3. Click **Copy tracking picture**, then paste it at the very end of your Gmail message (nothing visible appears).
4. If you added links, copy the tracked versions and use them in your email.
5. Send from Gmail, then click **I've sent it** in Open Tracker.

## Who sees what

- **Admin:** sees their own results, can switch to any teammate's results, and adds or pauses people on the **Team** page.
- **Everyone else:** sees only their own emails and results.

## How opens are counted

| What happened | Shown as |
| --- | --- |
| Picture loaded before you pressed "I've sent it" (your own preview) | Not counted |
| You viewing it while signed in to the tracker, or from your own internet connection | Not counted |
| Loaded within 10 seconds of sending (security scanners) | Maybe opened |
| Apple Mail loaded it automatically | Maybe opened |
| Anything else | **Opened** |
| A tracked link was clicked | **Clicked** (also counts as opened) |

"Maybe opened" is shown separately and never counted in the open rate.
On any email you can press **That was me** to remove an open that wasn't them.

**Limits of email tracking:**

- If someone's mail app blocks pictures, an open can be missed. A link click still counts.
- When someone using Gmail opens the email more than once, Google may only load the picture the first time.
- If you open your own sent email in the Gmail app on your phone, it can count as an open. Use **That was me** to remove it.

---

## Try it on your computer

You need Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local   # then edit ADMIN_EMAIL / ADMIN_PASSWORD
npm run dev
```

Open http://localhost:3000 and sign in with the admin email and password from `.env.local`.
On your computer the data is stored in the `.data` folder, so there's no database to set up.
The picture only works for you while it runs on your computer. To track real emails, put it online (below).

## Put it online (free)

1. **Database:** create a free project at [neon.tech](https://neon.tech) and copy its connection string (starts with `postgresql://`).
2. **Code:** push this folder to a GitHub repository.
3. **Hosting:** at [vercel.com](https://vercel.com), click **Add New → Project**, pick the repository, and add these environment variables:
   - `DATABASE_URL`: the Neon connection string
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`: your first admin account
   - `TRACK_BASE_URL` (optional): your own address, such as `https://track.yourcompany.com`
4. Click **Deploy**. Sign in, change your password on the **Account** page, then invite your team from **Team**.

The admin account is created automatically the first time the app starts with an empty database.

---

## For developers

- Next.js 15 (App Router, server actions) with [Drizzle ORM](https://orm.drizzle.team). The tables, indexes and types are in `src/db/schema.ts`.
- Database: a normal Postgres server (Aiven, Supabase, RDS, ...) for any `DATABASE_URL`, `@neondatabase/serverless` for neon.tech, or [PGlite](https://pglite.dev) stored in `./.data` when `DATABASE_URL` is empty.
- Changing the database: edit `src/db/schema.ts`, run `npm run db:generate`, and read the new file in `drizzle/`. The app applies pending files by itself the first time it starts (`src/db/index.ts`), so a running app costs one quick check per start. Write migrations so they are safe to run twice.
- A database made before Drizzle was added is recognised and adopted as it is: the first migration (`0000_baseline`) describes it and is skipped, then the later ones run.
- `GET /o/<token>.gif` returns the pixel and records the open afterwards with `after()`. An open is saved and the email's totals are updated in one database call.
- `GET /c/<token>/<n>` records a click and redirects (302) only to a URL saved for that email.
- Classification rules are in `src/lib/track.ts`. Totals are added to as opens arrive, and rebuilt from the raw events after a correction (`recompute`).
- Every page checks access on the server: users only see their own rows, and admins can view anyone.
- Backing up a live database: use `pg_dump` from the same major version as the server (for example `docker run postgres:18-alpine pg_dump ...`). Keep the file out of git; `.data` is already ignored.
- Putting saved data into a new database: first start the app once with `ADMIN_EMAIL` and `ADMIN_PASSWORD` empty (it only builds the tables), stop it, load the data file with `psql`, then start it normally. Loading it into a database where the first admin was already created will clash on that admin's email.
- Times are stored as exact moments (`timestamptz`, which Postgres keeps in UTC) and the server never converts them. They are turned into local time only in the browser (`src/lib/when.ts`, using date-fns), so everyone sees their own timezone, including people who open a shared link.
