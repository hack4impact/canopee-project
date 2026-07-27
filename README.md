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

## Deploying

Vercel is wired up to the repo. `develop` is the production branch; every PR gets a preview URL. `DATABASE_URL` needs to be set in the Vercel project for both Production and Preview.
