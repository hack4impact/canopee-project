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
  description: 'Historique de vos patrouilles passées.',
}

export const dynamic = 'force-dynamic'

const CARD = 'rounded-2xl border border-canopee-forest/10 bg-white/70 shadow-sm'

const ORIGINS = {
  patrouille: { href: '/patrouilles', label: 'Patrouiller' },
  profil: { href: '/profil', label: 'Profil' },
}

type OriginKey = keyof typeof ORIGINS

/** Where the patroller came from, so the header button sends them back there. */
function parseOrigin(from: string | undefined): OriginKey {
  return from === 'patrouille' ? 'patrouille' : 'profil'
}

function pageHref(page: number, from: OriginKey): string {
  return `/patrouilles/historique?page=${page}&from=${from}`
}

type PatrouillesPageProps = {
  searchParams: Promise<{ page?: string; from?: string }>
}

export default async function PatrouillesHistoryPage({
  searchParams,
}: PatrouillesPageProps) {
  const profile = await requireApprovedUser()
  const { page: pageParam, from } = await searchParams
  const page = parsePageParam(pageParam)
  const origin = parseOrigin(from)
  const { items, hasNextPage } = await listPatrolsForUser(profile.id, page)

  return (
    <div className="flex min-h-dvh w-full flex-col bg-canopee-cream">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 pt-10 pb-32 sm:px-6">
        <header className="flex items-center justify-between gap-4">
          <h1 className="font-heading text-2xl text-canopee-forest sm:text-3xl">
            Mes patrouilles
          </h1>
          <Link
            href={ORIGINS[origin].href}
            className="inline-flex shrink-0 items-center rounded-full bg-canopee-forest px-4 py-2 text-sm font-semibold text-canopee-cream shadow-sm transition-colors hover:bg-canopee-green focus-visible:ring-2 focus-visible:ring-canopee-lime focus-visible:outline-none"
          >
            {ORIGINS[origin].label}
          </Link>
        </header>

        {items.length === 0 ? (
          <p
            className={`my-auto px-6 py-12 text-center text-sm leading-relaxed text-canopee-forest/70 ${CARD}`}
          >
            Vous n&apos;avez pas encore de patrouille enregistrée.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((patrol) => (
              <li key={patrol.id}>
                {patrol.endedAt === null ? (
                  <div className={`flex flex-col gap-0.5 px-5 py-4 ${CARD}`}>
                    <span className="font-heading text-base text-canopee-forest">
                      {formatPatrolDate(patrol.startedAt)}
                    </span>
                    <span className="text-sm text-canopee-forest/70">
                      Patrouille en cours
                    </span>
                  </div>
                ) : (
                  <Link
                    href={`/patrouilles/${patrol.id}`}
                    className={`flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:border-canopee-green/40 ${CARD}`}
                  >
                    <span className="flex flex-col gap-0.5">
                      <span className="font-heading text-base text-canopee-forest">
                        {formatPatrolDate(patrol.startedAt)}
                      </span>
                      <span className="text-sm text-canopee-forest/70">
                        {formatDuration(patrol.durationSeconds)} ·{' '}
                        {formatDistance(patrol.distanceMetres)}
                      </span>
                    </span>

                    <span className="shrink-0 text-sm font-medium text-canopee-green">
                      Voir le trajet
                    </span>
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
                href={pageHref(page - 1, origin)}
                className="text-canopee-forest/70 underline underline-offset-4 hover:text-canopee-forest"
              >
                Page précédente
              </Link>
            ) : (
              <span />
            )}

            {hasNextPage && (
              <Link
                href={pageHref(page + 1, origin)}
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
