import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BottomNav } from '@/components/bottom-nav'
import { PatrolRouteMap } from '@/components/patrol-route-map'
import { requireApprovedUser } from '@/lib/auth/current-user'
import { canViewPatrol } from '@/lib/patrols/access'
import {
  formatDistance,
  formatDuration,
  formatPatrolDate,
  formatPatrolTime,
} from '@/lib/patrols/format'
import {
  durationSeconds,
  getPatrolWithUser,
  listPatrolRoute,
} from '@/lib/patrols/queries'
import { findWoodedArea } from '@/lib/patrols/woods'
import { formatEventNumber } from '@/lib/reports/format'
import {
  listReportsDuringPatrol,
  REPORT_CATEGORY_LABELS,
} from '@/lib/reports/queries'

export const metadata: Metadata = {
  title: 'Résumé de la patrouille | Canopée',
  description: 'Trajet, durée et signalements de votre patrouille.',
}

export const dynamic = 'force-dynamic'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const CARD = 'rounded-2xl border border-canopee-forest/10 bg-white/70 shadow-sm'

const DASH = '—'

type PatrouillePageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string }>
}

export default async function PatrouillePage({
  params,
  searchParams,
}: PatrouillePageProps) {
  const profile = await requireApprovedUser()
  const { id } = await params
  const { from } = await searchParams
  const origin = from === 'profil' ? 'profil' : 'patrouille'

  if (!UUID_PATTERN.test(id)) {
    notFound()
  }

  const patrol = await getPatrolWithUser(id)

  if (!patrol || !canViewPatrol(profile, patrol)) {
    notFound()
  }

  const [route, signalements] = await Promise.all([
    listPatrolRoute(patrol.id),
    listReportsDuringPatrol(patrol.userId, patrol.startedAt, patrol.endedAt),
  ])

  const sentier = findWoodedArea(route)

  const stats = [
    { label: 'Départ', value: formatPatrolTime(patrol.startedAt) },
    {
      label: 'Arrivée',
      value: patrol.endedAt ? formatPatrolTime(patrol.endedAt) : DASH,
    },
    {
      label: 'Durée',
      value: formatDuration(durationSeconds(patrol.startedAt, patrol.endedAt)),
    },
  ]

  return (
    <div className="flex min-h-dvh w-full flex-col bg-canopee-cream">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-32 sm:px-6">
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl text-canopee-forest sm:text-3xl">
              {sentier ?? 'Patrouille'}
            </h1>
            <p className="text-sm text-canopee-forest/70">
              {formatPatrolDate(patrol.startedAt)}
              {patrol.distanceMeters === null
                ? ''
                : ` · ${formatDistance(patrol.distanceMeters)}`}
            </p>
          </div>

          <Link
            href={`/patrouilles/historique?from=${origin}`}
            className="inline-flex shrink-0 items-center rounded-full bg-canopee-forest px-4 py-2 text-sm font-semibold text-canopee-cream shadow-sm transition-colors hover:bg-canopee-green focus-visible:ring-2 focus-visible:ring-canopee-lime focus-visible:outline-none"
          >
            Mes patrouilles
          </Link>
        </header>

        {patrol.endedAt === null ? (
          <p
            className={`my-auto px-6 py-12 text-center text-sm leading-relaxed text-canopee-forest/70 ${CARD}`}
          >
            Cette patrouille est en cours. Son résumé s&apos;affichera une fois
            qu&apos;elle sera terminée.
          </p>
        ) : (
          <>
            <div className={`overflow-hidden ${CARD}`}>
              <PatrolRouteMap
                patrolId={patrol.id}
                accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                className="h-[33dvh] min-h-[200px]"
              />
            </div>

            <dl className="flex flex-wrap justify-center gap-2">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center rounded-2xl bg-white px-3 py-1.5 shadow-sm"
                >
                  <dd className="font-heading text-sm text-canopee-coral-dark">
                    {stat.value}
                  </dd>
                  <dt className="text-[10px] font-semibold tracking-wide text-canopee-coral uppercase">
                    {stat.label}
                  </dt>
                </div>
              ))}
            </dl>

            <section className="flex flex-col gap-3">
              <h2 className="font-heading text-lg text-canopee-forest">
                Signalements ({signalements.length})
              </h2>

              {signalements.length === 0 ? (
                <p
                  className={`px-5 py-8 text-center text-sm text-canopee-coral ${CARD}`}
                >
                  Aucun signalement pendant cette patrouille.
                </p>
              ) : (
                <ul className="flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
                  {signalements.map((signalement) => (
                    <li
                      key={signalement.id}
                      className={`flex items-center justify-between gap-4 px-4 py-2.5 ${CARD}`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-heading text-sm text-canopee-coral-dark">
                          {REPORT_CATEGORY_LABELS[signalement.category]}
                        </span>
                        <span className="text-xs text-canopee-coral">
                          {formatEventNumber(signalement.eventNumber)} ·{' '}
                          {formatPatrolTime(signalement.createdAt)}
                        </span>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                          signalement.resolvedAt
                            ? 'bg-canopee-green/15 text-canopee-forest'
                            : 'bg-canopee-coral/15 text-canopee-coral-dark'
                        }`}
                      >
                        {signalement.resolvedAt ? 'Résolu' : 'En attente'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
