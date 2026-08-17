import type { Metadata } from 'next'
import Link from 'next/link'
import { BottomNav } from '@/components/bottom-nav'
import { requireApprovedUser } from '@/lib/auth/current-user'
import {
  formatDistance,
  formatDuration,
  formatPatrolDate,
} from '@/lib/patrols/format'
import { listPatrolsForUser, parsePageParam } from '@/lib/patrols/queries'

export const metadata: Metadata = {
  title: 'Mes patrouilles | Canopée',
  description: 'Historique de vos patrouilles enregistrées.',
}

export const dynamic = 'force-dynamic'

type PatrouillesPageProps = {
  searchParams: Promise<{ page?: string }>
}

export default async function PatrouillePage({
  searchParams,
}: PatrouillesPageProps) {
  const profile = await requireApprovedUser()
  const page = parsePageParam((await searchParams).page)
  const { items, hasNextPage } = await listPatrolsForUser(profile.id, page)

  return (
    <div className="flex min-h-dvh w-full flex-col bg-canopee-cream">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-10 pb-32 sm:px-6">
        <header className="flex items-center justify-between gap-4">
          <h1 className="font-heading text-2xl text-canopee-forest sm:text-3xl">
            Mes patrouilles
          </h1>
          <Link
            href="/carte"
            className="shrink-0 text-sm text-canopee-forest/70 underline underline-offset-4 hover:text-canopee-forest"
          >
            Carte
          </Link>
        </header>

        {items.length === 0 ? (
          <p className="rounded-2xl border border-canopee-forest/10 bg-white/70 px-5 py-10 text-center text-sm text-canopee-forest/70 shadow-sm">
            Vous n&apos;avez pas encore de patrouille enregistrée.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((patrol) => (
              <li
                key={patrol.id}
                className="flex flex-col gap-1 rounded-2xl border border-canopee-forest/10 bg-white/70 px-5 py-4 shadow-sm"
              >
                <span className="font-heading text-base text-canopee-forest">
                  {formatPatrolDate(patrol.startedAt)}
                </span>
                <span className="text-sm text-canopee-forest/70">
                  {formatDuration(patrol.durationSeconds)} ·{' '}
                  {formatDistance(patrol.distanceMetres)}
                </span>
                {patrol.endedAt !== null && (
                  <Link
                    href={`/patrouilles/${patrol.id}`}
                    className="self-start text-sm font-medium text-canopee-green underline underline-offset-4 hover:text-canopee-forest"
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
                className="text-canopee-forest/70 underline underline-offset-4 hover:text-canopee-forest"
              >
                Page précédente
              </Link>
            ) : (
              <span />
            )}

            {hasNextPage && (
              <Link
                href={`/patrouilles?page=${page + 1}`}
                className="text-canopee-forest/70 underline underline-offset-4 hover:text-canopee-forest"
              >
                Page suivante
              </Link>
            )}
          </nav>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
