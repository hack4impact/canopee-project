import type { Metadata } from 'next'
import Link from 'next/link'
import { getPendingUsers } from '@/app/admin/volunteers/actions'
import { AccountSection } from '@/components/account-section'
import { BottomNav } from '@/components/bottom-nav'
import { PatrolRoutePreview } from '@/components/patrol-route-preview'
import { PendingReportsNotice } from '@/components/pending-reports-notice'
import { requireApprovedUser } from '@/lib/auth/current-user'
import { isAdmin, type Role } from '@/lib/auth/roles'
import { formatDistance, formatDuration } from '@/lib/patrols/format'
import {
  getLastPatrolForUser,
  getPatrolTotalsForUser,
  listPatrolRoute,
} from '@/lib/patrols/queries'
import { getReportTotalsForUser } from '@/lib/reports/queries'

export const metadata: Metadata = {
  title: 'Profil | Canopée',
  description: 'Votre compte, vos patrouilles et vos signalements.',
}

export const dynamic = 'force-dynamic'

const ROLE_LABELS: Record<Role, string> = {
  volunteer: 'Bénévole',
  pro: 'Professionnel',
  admin: 'Administrateur',
}

const dateFormatter = new Intl.DateTimeFormat('fr-CA', {
  dateStyle: 'long',
  timeZone: 'America/Toronto',
})

const TILE =
  'flex items-center gap-3 rounded-2xl px-3.5 py-4 text-canopee-cream transition-colors'

const TILE_NUMBER = 'font-heading text-3xl leading-none font-bold tabular-nums'

const ADMIN_ROW =
  'flex items-center gap-3 rounded-xl border border-canopee-forest/20 bg-white px-3 py-2.5 text-[15px] font-bold text-canopee-forest transition-colors hover:border-canopee-green/50 focus-visible:ring-2 focus-visible:ring-canopee-green focus-visible:outline-none'

export default async function ProfilPage() {
  const profile = await requireApprovedUser()
  const admin = isAdmin(profile)

  const [patrols, reports, lastPatrol, pendingUsers] = await Promise.all([
    getPatrolTotalsForUser(profile.id),
    getReportTotalsForUser(profile.id),
    getLastPatrolForUser(profile.id),
    admin ? getPendingUsers() : Promise.resolve([]),
  ])

  const lastRoute = lastPatrol ? await listPatrolRoute(lastPatrol.id) : []

  const pendingReports = reports.count - reports.resolved

  const fullName = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="flex min-h-dvh w-full flex-col bg-canopee-cream">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-36 sm:px-6">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-heading text-3xl text-canopee-forest">Profil</h1>
          <p className="text-lg font-bold text-canopee-forest">
            {fullName || profile.email}
            <span className="text-base font-semibold text-canopee-forest/55">
              {' '}
              · {ROLE_LABELS[profile.role]}
            </span>
          </p>
        </div>

        <PendingReportsNotice />

        {lastPatrol && (
          <div className="flex flex-col gap-1.5">
            <h2 className="text-sm font-extrabold tracking-[0.08em] text-canopee-forest/50 uppercase">
              Statistiques
            </h2>

            <Link
              href={`/patrouilles/${lastPatrol.id}?from=profil`}
              className="block overflow-hidden rounded-2xl ring-1 ring-canopee-forest/10 transition-colors hover:ring-canopee-green/40 focus-visible:ring-2 focus-visible:ring-canopee-green focus-visible:outline-none"
            >
              <PatrolRoutePreview
                points={lastRoute}
                seed={lastPatrol.id}
                className="block h-32 w-full"
              />

              <span className="flex items-center gap-3 bg-white px-3 py-2.5">
                <span className="flex flex-1 flex-col">
                  <span className="text-[11px] font-extrabold tracking-[0.06em] text-canopee-forest/45 uppercase">
                    Dernière patrouille
                  </span>
                  <span className="text-sm font-bold text-canopee-forest">
                    {dateFormatter.format(lastPatrol.startedAt)}
                  </span>
                </span>
                <span className="flex items-baseline gap-1.5 text-sm tabular-nums">
                  <span className="font-bold text-canopee-forest">
                    {formatDuration(lastPatrol.durationSeconds)}
                  </span>
                  <span className="text-canopee-forest/30">·</span>
                  <span className="font-bold text-canopee-forest">
                    {formatDistance(lastPatrol.distanceMetres)}
                  </span>
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5 text-canopee-forest/40"
                  aria-hidden="true"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </span>
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/patrouilles/historique?from=profil"
            className={`${TILE} bg-canopee-forest transition-colors hover:bg-[#00351a] focus-visible:ring-2 focus-visible:ring-canopee-green focus-visible:outline-none`}
          >
            <span className={TILE_NUMBER}>{patrols.count}</span>
            <span className="flex min-w-0 flex-col">
              <span className="text-base font-extrabold">Patrouilles</span>
              <span className="text-[13px] leading-tight text-canopee-cream/80">
                {formatDistance(patrols.distanceMetres)}
                <br />
                {formatDuration(patrols.durationSeconds)}
              </span>
            </span>
          </Link>

          <div className={`${TILE} bg-canopee-coral`}>
            <span className={TILE_NUMBER}>{reports.count}</span>
            <span className="flex min-w-0 flex-col">
              <span className="text-base font-extrabold">Signalements</span>
              <span className="text-[13px] leading-tight text-canopee-cream/80">
                {reports.resolved} résolu{reports.resolved === 1 ? '' : 's'}
                {pendingReports > 0 && (
                  <>
                    <br />
                    <span className="font-extrabold text-canopee-cream">
                      {pendingReports} en attente
                    </span>
                  </>
                )}
              </span>
            </span>
          </div>
        </div>

        {admin && (
          <section className="flex flex-col gap-1.5">
            <h2 className="text-sm font-extrabold tracking-[0.08em] text-canopee-forest/50 uppercase">
              Administration
            </h2>

            <Link href="/admin/volunteers" className={ADMIN_ROW}>
              <span className="flex-1">Comptes en attente</span>
              <span className="font-heading text-lg text-canopee-green tabular-nums">
                {pendingUsers.length}
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5 opacity-45"
                aria-hidden="true"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>

            <Link href="/admin/membres" className={ADMIN_ROW}>
              <span className="flex-1">Gestion des membres</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5 opacity-45"
                aria-hidden="true"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          </section>
        )}

        <AccountSection />
      </main>

      <BottomNav />
    </div>
  )
}
