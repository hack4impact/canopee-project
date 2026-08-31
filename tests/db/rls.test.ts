import 'dotenv/config'
import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { db } from '@/db'

// Needs a real database. CI has no .env, so DATABASE_URL stays unset there and
// these skip, the same way the concurrency test does.
const describeDb = describe.skipIf(!process.env.DATABASE_URL)

describeDb('row level security', () => {
  it('is enabled on every public table', async () => {
    const unprotected = await db.execute(sql`
      select relname
      from pg_class
      where relnamespace = 'public'::regnamespace
        and relkind = 'r'
        and not relrowsecurity
      order by relname`)

    expect(unprotected.map((row) => row.relname)).toEqual([])
  })

  it('leaves anon and authenticated without any grant on public tables', async () => {
    const grants = await db.execute(sql`
      select table_name, grantee, privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public'
        and grantee in ('anon', 'authenticated')
      order by table_name, grantee, privilege_type`)

    expect(grants).toEqual([])
  })

  it('has no policy granting access back to those roles', async () => {
    const policies = await db.execute(sql`
      select tablename, policyname
      from pg_policies
      where schemaname = 'public'
        and ('anon' = any(roles) or 'authenticated' = any(roles) or 'public' = any(roles))
      order by tablename, policyname`)

    expect(policies).toEqual([])
  })
})
