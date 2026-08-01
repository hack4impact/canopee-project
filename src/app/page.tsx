import Link from 'next/link'
import { db, users } from '@/db'
import { getCurrentUserProfile } from '@/lib/auth/current-user'
import { isAdmin } from '@/lib/auth/roles'
import { logout } from '@/app/login/actions'

// This page reads live data from Postgres on every request, so it must not be
// statically prerendered at build time.
export const dynamic = 'force-dynamic'

export default async function Home() {
  const allUsers = await db.select().from(users)
  const currentUser = await getCurrentUserProfile()

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col gap-8 px-6 py-24">
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
              Canopée
            </h1>
            <div className="flex shrink-0 items-center gap-3">
              {currentUser && isAdmin(currentUser) && (
                <Link
                  href="/admin/volunteers"
                  className="rounded bg-black px-3 py-1.5 text-sm text-white dark:bg-zinc-50 dark:text-black"
                >
                  Review requests
                </Link>
              )}
              {currentUser ? (
                <form action={logout}>
                  <button
                    type="submit"
                    className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
                  >
                    Log out
                  </button>
                </form>
              ) : (
                <Link
                  href="/login"
                  className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
                >
                  Log in
                </Link>
              )}
            </div>
          </div>

          {currentUser && (
            <p className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              Signed in as{' '}
              <span className="font-medium text-black dark:text-zinc-50">
                {currentUser.email}
              </span>{' '}
              <span className="font-mono text-zinc-500">
                ({currentUser.role})
              </span>
            </p>
          )}

          <p className="text-zinc-600 dark:text-zinc-400">
            {allUsers.length} user{allUsers.length === 1 ? '' : 's'} fetched
            from Supabase Postgres through Drizzle.
          </p>
        </header>

        {allUsers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-zinc-500 dark:border-zinc-700">
            No users yet. Run <code className="font-mono">npm run db:seed</code>{' '}
            to add some.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {allUsers.map((user) => (
              <li
                key={user.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <span className="font-medium text-black dark:text-zinc-50">
                  {user.email}
                </span>
                <span className="font-mono text-sm text-zinc-500">
                  {user.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
