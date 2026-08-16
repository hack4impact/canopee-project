import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PatrolDetails } from '@/components/patrol-details'
import { PatrolRouteMap } from '@/components/patrol-route-map'
import { requireApprovedUser } from '@/lib/auth/current-user'
import { canViewPatrol } from '@/lib/patrols/access'
import { formatPatrolDate } from '@/lib/patrols/format'
import { durationSeconds, getPatrolWithUser } from '@/lib/patrols/queries'

export const metadata: Metadata = {
  title: 'Trajet de la patrouille | Canopée',
  description: 'Trajet parcouru pendant une patrouille terminée.',
}

export const dynamic = 'force-dynamic'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type PatrouillePageProps = {
  params: Promise<{ id: string }>
}

export default async function PatrouillePage({ params }: PatrouillePageProps) {
  const profile = await requireApprovedUser()
  const { id } = await params

  if (!UUID_PATTERN.test(id)) {
    notFound()
  }

  const patrol = await getPatrolWithUser(id)

  if (!patrol || !canViewPatrol(profile, patrol)) {
    notFound()
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl dark:text-zinc-50">
            {formatPatrolDate(patrol.startedAt)}
          </h1>
          <Link
            href="/patrouilles/historique"
            className="shrink-0 text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
          >
            Mes patrouilles
          </Link>
        </header>

        {patrol.endedAt === null ? (
          <p className="rounded-lg border border-zinc-200 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            Cette patrouille est en cours. Son trajet s&apos;affichera une fois
            qu&apos;elle sera terminée.
          </p>
        ) : (
          <PatrolRouteMap
            patrolId={patrol.id}
            accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          >
            <span className="absolute top-4 right-4 z-10 rounded-full bg-canopee-forest px-4 py-2 text-sm font-medium text-canopee-cream shadow-lg ring-1 ring-black/5">
              {patrol.patrollerEmail}
            </span>
            <PatrolDetails
              startedAt={patrol.startedAt}
              endedAt={patrol.endedAt}
              durationSeconds={durationSeconds(
                patrol.startedAt,
                patrol.endedAt,
              )}
              distanceMetres={patrol.distanceMeters}
            />
          </PatrolRouteMap>
        )}
      </main>
    </div>
  )
}
