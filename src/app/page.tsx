import Link from 'next/link'
import { logout } from '@/app/login/actions'

export const dynamic = 'force-dynamic'

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col gap-8 px-6 py-24">
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
              Canopée
            </h1>
            <div className="flex shrink-0 items-center gap-3">
              <Link
                href="/login"
                className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
              >
                Log in
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
                >
                  Log out
                </button>
              </form>
            </div>
          </div>

          <p className="text-zinc-600 dark:text-zinc-400">
            Welcome to the Canopée app.
          </p>
        </header>
      </main>
    </div>
  )
}
