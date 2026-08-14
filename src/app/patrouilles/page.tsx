import type { Metadata } from 'next'
import Link from 'next/link'
import { requireApprovedUser } from '@/lib/auth/current-user'
import {
  formatDistance,
  formatDuration,
  formatPatrolDate,
} from '@/lib/patrols/format'
import { listPatrolsForUser, parsePageParam } from '@/lib/patrols/queries'

export const metadata: Metadata = {
  title: 'Mes patrouilles | Canopée',
  description: 'Historique de vos patrouilles passées.',
}

export const dynamic = 'force-dynamic'

type PatrouillesPageProps = {
  searchParams: Promise<{ page?: string }>
}

export default async function PatrouillesPage({
  searchParams,
}: PatrouillesPageProps) {
  const profile = await requireApprovedUser()
  const page = parsePageParam((await searchParams).page)
  const { items, hasNextPage } = await listPatrolsForUser(profile.id, page)

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl dark:text-zinc-50">
            Mes patrouilles
          </h1>
          <Link
            href="/carte"
            className="shrink-0 text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
          >
            Carte
          </Link>
        </header>

        {items.length === 0 ? (
          <p className="rounded-lg border border-zinc-200 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            Vous n&apos;avez pas encore de patrouille enregistrée.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((patrol) => (
              <li
                key={patrol.id}
                className="flex flex-col gap-1 rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
              >
                <span className="text-sm font-medium text-black dark:text-zinc-50">
                  {formatPatrolDate(patrol.startedAt)}
                </span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {formatDuration(patrol.durationSeconds)} ·{' '}
                  {formatDistance(patrol.distanceMetres)}
                </span>
                {patrol.endedAt !== null && (
                  <Link
                    href={`/patrouilles/${patrol.id}`}
                    className="self-start text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
                  >
                    Voir le trajet
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}

        {(page > 1 || hasNextPage) && (
          <nav className="flex items-center justify-between gap-4 text-sm">
            {page > 1 ? (
              <Link
                href={`/patrouilles?page=${page - 1}`}
                className="text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
              >
                Page précédente
              </Link>
            ) : (
              <span />
            )}

            {hasNextPage && (
              <Link
                href={`/patrouilles?page=${page + 1}`}
                className="text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
              >
                Page suivante
              </Link>
            )}
          </nav>
        )}
      </main>
    </div>
  )
}
