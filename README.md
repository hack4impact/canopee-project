# Canopée

Next.js app (App Router + TypeScript) with Drizzle ORM on Supabase Postgres, deployed to Vercel.

## Getting started

You'll need Node 20+ and access to the Supabase project from Sprint 0.

```bash
npm install
cp .env.example .env
```

Grab the connection string from Supabase (Project Settings → Database → Connection string → Transaction pooler, port 6543) and drop it into `.env` as `DATABASE_URL`. Remember to replace the `[YOUR-PASSWORD]` placeholder and URL-encode any special characters in the password (`#` → `%23`, `?` → `%3F`, `*` → `%2A`, etc.) or the URL won't parse.

Then set up the database and start the dev server:

```bash
npm run db:migrate   # apply migrations
npm run db:seed      # a few demo users
npm run dev
```

The home page at http://localhost:3000 lists users read straight from Postgres through Drizzle.

## Working with the database

Schema lives in `src/db/schema.ts`. After changing it:

```bash
npm run db:generate   # writes a migration to drizzle/
npm run db:migrate    # applies it
```

Commit the generated files in `drizzle/`. `npm run db:studio` opens Drizzle Studio if you want to poke around.

## Linting and formatting

ESLint covers correctness, Prettier covers style. They don't overlap:
`eslint-config-prettier` turns off the ESLint rules that would argue with
Prettier.

```bash
npm run lint           # ESLint
npm run format         # Prettier, rewrites files
npm run format:check   # Prettier, reports only
```

You won't usually run these by hand. A Husky pre-commit hook runs lint-staged on
your staged files. Formatting gets fixed and re-staged automatically; lint errors
that ESLint can't fix will reject the commit until you sort them out.

The hook installs itself on `npm install` via the `prepare` script, so there's
nothing to set up. `git commit --no-verify` skips it if you need an escape hatch.

## Deploying

Vercel is wired up to the repo. `develop` is the production branch; every PR gets a preview URL. `DATABASE_URL` needs to be set in the Vercel project for both Production and Preview.

## User roles and status

### `role`

Permission level, assigned at signup (defaults to `volunteer`) or manually by an admin. Hierarchy: Admin > Pro > Volunteer.

| Value       | Meaning                                               |
| ----------- | ----------------------------------------------------- |
| `volunteer` | Default role for public signups.                      |
| `pro`       | Assigned manually by an admin.                        |
| `admin`     | Full permissions, assigned manually by another admin. |

### `status`

Approval state. Applies to volunteers and pros — admins are always `approved`.

| Value      | Meaning                     |
| ---------- | --------------------------- |
| `pending`  | Default for public signups. |
| `approved` | Active account.             |
| `rejected` | Denied by an admin.         |

Public signups create a `volunteer` account with `pending` status. `pro`/`admin` are never set through the signup form. Passwords are handled by Supabase Auth, not stored here.

## Mapbox usage monitoring

Mapbox has no hard spending cap and no API to query real usage stats, so we
track map loads ourselves and compare against the free tier limit.

- **Free tier threshold:** 50,000 map loads/month.
- **How it's counted:** every time the map component finishes loading in a
  browser, it pings `POST /api/map-loads`, which increments a per-UTC-month
  counter in the `map_load_counters` table. This is an approximation of
  Mapbox's own billing count, not the authoritative number.
- **Daily check:** a Vercel Cron job (`vercel.json`, `0 0 * * *`, 00:00 UTC)
  calls `GET /api/cron/mapbox-usage`, which logs the current month's count,
  remaining headroom, and a linear projection of the full month's usage.
  If the projection crosses **80%** of the threshold, it logs a `console.warn`.
- **Checking logs:** Vercel dashboard → Project → Logs, filter by
  `/api/cron/mapbox-usage` (or by the Cron Jobs tab, which lists each run).
- **Env vars:** set `CRON_SECRET` in the Vercel project (Production and
  Preview) to the same value Vercel uses to authenticate cron requests —
  see [Vercel's cron docs](https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
  Without it, the endpoint accepts any request (fine for local dev, not for
  prod).
- **No native Mapbox billing alert:** Mapbox does not offer a spending-cap or
  usage-alert feature (confirmed via their docs — the free-tier account has
  no such option). The self-tracked cron job above is the only automated
  safeguard; periodically checking the Mapbox Statistics page by hand is the
  only manual backstop beyond it.
