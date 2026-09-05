import type { Metadata } from 'next'
import Link from 'next/link'
import { BackButton } from '@/components/back-button'
import { BottomNav } from '@/components/bottom-nav'
import { ReportHistorySort } from '@/components/report-history-sort'
import { requireApprovedUser } from '@/lib/auth/current-user'
import { REPORT_CATEGORY_LABELS } from '@/lib/reports/categories'
import { formatEventNumber } from '@/lib/reports/format'
import { reportGroupColor } from '@/lib/reports/group-style'
import {
  parseHistorySort,
  parseHistoryStatus,
  sectionReports,
  type ReportHistorySort as SortValue,
  type ReportHistoryStatus,
} from '@/lib/reports/history'
import { parsePageParam } from '@/lib/patrols/queries'
import {
  getReportTotalsForUser,
  listReportsForUser,
} from '@/lib/reports/queries'

export const metadata: Metadata = {
  title: 'Mes signalements | Canopée',
  description: 'Historique de vos signalements et de leur suivi.',
}

export const dynamic = 'force-dynamic'

const dayFormatter = new Intl.DateTimeFormat('fr-CA', {
  day: '2-digit',
  timeZone: 'America/Toronto',
})

function historyHref(
  status: ReportHistoryStatus,
  sort: SortValue,
  page = 1,
): string {
  const suffix = page > 1 ? `&page=${page}` : ''

  return `/signalements?statut=${status}&tri=${sort}${suffix}`
}

export default async function SignalementsPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; tri?: string; page?: string }>
}) {
  const profile = await requireApprovedUser()
  const { statut, tri, page: pageParam } = await searchParams
  const status = parseHistoryStatus(statut)
  const sort = parseHistorySort(tri)
  const page = parsePageParam(pageParam)

  const [{ items, hasNextPage }, totals] = await Promise.all([
    listReportsForUser(profile.id, { page, status, sort }),
    getReportTotalsForUser(profile.id),
  ])

  const open = totals.count - totals.resolved
  const sections = sectionReports(items, sort)

  const filters: { value: ReportHistoryStatus; label: string; n: number }[] = [
    { value: 'all', label: 'Tous', n: totals.count },
    { value: 'open', label: 'En attente', n: open },
    { value: 'resolved', label: 'Résolus', n: totals.resolved },
  ]

  return (
    <div className="flex min-h-dvh w-full flex-col bg-canopee-cream">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pb-32 sm:px-6">
        <header className="sticky top-0 z-30 -mx-4 bg-canopee-cream/95 px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-3 backdrop-blur-sm sm:-mx-6 sm:px-6 flex items-center gap-3">
          <BackButton fallback="/profil" />
          <h1 className="font-heading text-2xl text-canopee-forest sm:text-3xl">
            Mes signalements
          </h1>
        </header>

        {totals.count === 0 ? (
          <div className="my-auto flex flex-col items-center gap-3 rounded-2xl border border-dashed border-canopee-forest/25 px-6 py-10 text-center">
            <p className="text-sm leading-relaxed text-canopee-forest/70">
              Aucun signalement enregistré pour l&apos;instant. Ceux transmis
              depuis la carte apparaîtront ici, avec leur suivi.
            </p>
            <Link
              href="/signaler"
              className="rounded-lg bg-canopee-green px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-canopee-forest focus-visible:ring-2 focus-visible:ring-canopee-green focus-visible:outline-none"
            >
              Faire un signalement
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="flex flex-1 gap-1 rounded-[10px] bg-canopee-forest/8 p-[3px]">
                {filters.map((filter) => (
                  <Link
                    key={filter.value}
                    replace
                    href={historyHref(filter.value, sort)}
                    aria-current={filter.value === status ? 'page' : undefined}
                    className={`flex-1 rounded-md py-1.5 text-center text-xs font-bold tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-canopee-green focus-visible:outline-none ${
                      filter.value === status
                        ? 'bg-canopee-forest text-canopee-cream'
                        : 'text-canopee-forest/60 hover:text-canopee-forest'
                    }`}
                  >
                    {filter.label} {filter.n}
                  </Link>
                ))}
              </div>

              <ReportHistorySort sort={sort} status={status} />
            </div>

            {items.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-canopee-forest/25 px-5 py-8 text-center text-sm text-canopee-forest/70">
                Aucun signalement dans ce filtre.
              </p>
            ) : (
              sections.map((section) => (
                <section key={section.key} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline gap-2 px-0.5">
                    <h2 className="text-[11px] font-extrabold tracking-[0.12em] text-canopee-forest/50 uppercase">
                      {section.label}
                    </h2>
                    <span className="h-px flex-1 bg-canopee-forest/12" />
                    <span className="text-[11px] font-bold text-canopee-forest/35 tabular-nums">
                      {section.items.length}
                    </span>
                  </div>

                  <ul className="flex flex-col gap-2">
                    {section.items.map((report) => {
                      const resolved = report.resolvedAt !== null

                      return (
                        <li
                          key={report.id}
                          className={`grid grid-cols-[1.75rem_1fr_auto] items-center gap-3 rounded-[13px] border px-3 py-2.5 ${
                            resolved
                              ? 'border-dashed border-canopee-forest/15'
                              : 'border-canopee-forest/10 bg-white/70'
                          }`}
                        >
                          <span className="flex flex-col items-center leading-none">
                            <span className="text-[15px] font-extrabold text-canopee-forest tabular-nums">
                              {dayFormatter.format(report.createdAt)}
                            </span>
                            <span
                              className={`mt-[3px] h-[3px] w-3.5 rounded-[1px] ${
                                resolved ? 'opacity-40' : ''
                              }`}
                              style={{
                                backgroundColor: reportGroupColor(
                                  report.category,
                                ),
                              }}
                            />
                          </span>

                          <span className="flex min-w-0 flex-col">
                            <span
                              className={`truncate font-heading text-sm ${
                                resolved
                                  ? 'text-canopee-forest/70'
                                  : 'text-canopee-forest'
                              }`}
                            >
                              {REPORT_CATEGORY_LABELS[report.category]}
                            </span>
                            <span className="text-[11.5px] text-canopee-forest/60 tabular-nums">
                              {formatEventNumber(report.eventNumber)}
                            </span>
                            <span className="text-[11px] text-canopee-forest/55">
                              {(report as { woodedArea?: string }).woodedArea ??
                                'Autre'}
                            </span>
                          </span>

                          <span
                            className={`text-[11px] font-extrabold tracking-[0.04em] ${
                              resolved
                                ? 'text-canopee-forest/45'
                                : 'text-canopee-coral-dark'
                            }`}
                          >
                            {resolved ? 'Résolu' : 'En attente'}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))
            )}

            {(page > 1 || hasNextPage) && (
              <nav className="flex items-center justify-between gap-4 text-sm">
                {page > 1 ? (
                  <Link
                    href={historyHref(status, sort, page - 1)}
                    className="text-canopee-forest/70 underline underline-offset-4 hover:text-canopee-forest"
                  >
                    Page précédente
                  </Link>
                ) : (
                  <span />
                )}

                {hasNextPage && (
                  <Link
                    href={historyHref(status, sort, page + 1)}
                    className="text-canopee-forest/70 underline underline-offset-4 hover:text-canopee-forest"
                  >
                    Page suivante
                  </Link>
                )}
              </nav>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
