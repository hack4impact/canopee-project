import type { Metadata } from 'next'
import { ChevronRightIcon } from 'lucide-react'
import Link from 'next/link'
import { BackButton } from '@/components/back-button'
import { BottomNav } from '@/components/bottom-nav'
import { PatrolRoutePreview } from '@/components/patrol-route-preview'
import { requireApprovedUser } from '@/lib/auth/current-user'
import {
  formatDistance,
  formatDuration,
  formatPatrolDate,
} from '@/lib/patrols/format'
import { sectionPatrolsByMonth } from '@/lib/patrols/history'
import { listPatrolsForUser, parsePageParam } from '@/lib/patrols/queries'

export const metadata: Metadata = {
  title: 'Mes patrouilles | Canopée',
  description: 'Historique de vos patrouilles passées.',
}

export const dynamic = 'force-dynamic'

const CARD = 'rounded-2xl border border-canopee-forest/10 bg-white/70 shadow-sm'

const ORIGINS = {
  // Patrols now start from the map: send the patroller back there.
  patrouille: { href: '/carte', label: 'Carte' },
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
  const { items } = await listPatrolsForUser(profile.id, page)

  return (
    <div className="flex min-h-dvh w-full flex-col bg-canopee-cream">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 pb-32 sm:px-6">
        <header className="sticky top-0 z-30 -mx-4 bg-canopee-cream/95 px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-3 backdrop-blur-sm sm:-mx-6 sm:px-6 flex items-center gap-3">
          <BackButton fallback={ORIGINS[origin].href} />
          <h1 className="font-heading text-2xl text-canopee-forest sm:text-3xl">
            Mes patrouilles
          </h1>
        </header>

        {items.length === 0 ? (
          <p
            className={`my-auto px-6 py-12 text-center text-sm leading-relaxed text-canopee-forest/70 ${CARD}`}
          >
            Aucune patrouille.
          </p>
        ) : (
          sectionPatrolsByMonth(items).map((month) => (
            <section key={month.label} className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2 px-0.5">
                <h2 className="text-[11px] font-extrabold tracking-[0.12em] text-canopee-forest/50 uppercase">
                  {month.label}
                </h2>
                <span className="h-px flex-1 bg-canopee-forest/12" />
                <span className="text-[11px] font-bold text-canopee-forest/40 tabular-nums">
                  {month.items.length} · {formatDistance(month.distanceMetres)}
                </span>
              </div>

              <ul className="flex flex-col gap-3">
                {month.items.map((patrol) => {
                  const running = patrol.endedAt === null

                  const trace = (
                    <PatrolRoutePreview
                      points={patrol.route}
                      seed={patrol.id}
                      width={96}
                      height={74}
                      label={`Trajet du ${formatPatrolDate(patrol.startedAt)}`}
                      className="w-24 shrink-0 border-r border-canopee-forest/8"
                    />
                  )

                  const text = (
                    <span className="flex flex-1 items-center gap-3 px-4 py-3">
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="font-heading text-base text-canopee-forest">
                          {formatPatrolDate(patrol.startedAt)}
                        </span>
                        <span className="text-sm text-canopee-forest/70 tabular-nums">
                          {running ? (
                            'Patrouille en cours'
                          ) : (
                            <>
                              {formatDuration(patrol.durationSeconds)} ·{' '}
                              {formatDistance(patrol.distanceMetres)}
                            </>
                          )}
                        </span>
                      </span>

                      {!running && (
                        <ChevronRightIcon className="ml-auto size-4 shrink-0 text-canopee-forest/40" />
                      )}
                    </span>
                  )

                  return (
                    <li key={patrol.id}>
                      {running ? (
                        <div
                          className={`flex items-stretch overflow-hidden ${CARD}`}
                        >
                          {trace}
                          {text}
                        </div>
                      ) : (
                        <Link
                          href={`/patrouilles/${patrol.id}?from=${origin}`}
                          className={`flex items-stretch overflow-hidden transition-colors hover:border-canopee-green/40 ${CARD}`}
                        >
                          {trace}
                          {text}
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
        )}

        {page > 1 && (
          <nav className="flex items-center justify-between gap-4 text-sm">
            <Link
              href={pageHref(page - 1, origin)}
              className="text-canopee-forest/70 underline underline-offset-4 hover:text-canopee-forest"
            >
              Page précédente
            </Link>
            <span />
          </nav>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
