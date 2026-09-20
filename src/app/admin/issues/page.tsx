import type { Metadata } from 'next'
import { BackButton } from '@/components/back-button'
import { BottomNav } from '@/components/bottom-nav'
import { requireApprovedAccess } from '@/lib/auth/current-user'
import {
  lastTwoMonthsRange,
  parseDateRangeParams,
  toDateParam,
} from '@/lib/reports/date-range'
import { getReportPhotoUrl } from '@/lib/reports/photo'
import {
  listAllReports,
  type ReportSortBy,
  type ReportStatusFilter,
} from '@/lib/reports/queries'
import { IssueList } from './issue-list'

export const metadata: Metadata = {
  title: 'Signalements | Canopée',
  description: 'Traitement des signalements reçus.',
}

export const dynamic = 'force-dynamic'

export default async function AdminIssuesPage({
  searchParams,
}: {
  searchParams: Promise<{
    sortBy?: string
    statusFilter?: string
    startDate?: string
    endDate?: string
  }>
}) {
  await requireApprovedAccess('pro')

  const params = await searchParams
  const sortBy: ReportSortBy = params.sortBy === 'wooded' ? 'wooded' : 'wooded'
  const statusFilter: ReportStatusFilter =
    params.statusFilter === 'open' || params.statusFilter === 'resolved'
      ? params.statusFilter
      : 'all'

  const defaultRange = lastTwoMonthsRange()
  const startDateParam = params.startDate || toDateParam(defaultRange.from)
  const endDateParam = params.endDate || toDateParam(defaultRange.to)
  const parsedRange = parseDateRangeParams(startDateParam, endDateParam)
  const dateRange = parsedRange.ok
    ? parsedRange.range
    : { start: defaultRange.from, end: defaultRange.to }
  const dateRangeValue = parsedRange.ok
    ? { from: startDateParam, to: endDateParam }
    : { from: toDateParam(defaultRange.from), to: toDateParam(defaultRange.to) }

  const all = await listAllReports({ sortBy, dateRange })

  const counts = {
    all: all.length,
    open: all.filter((report) => report.resolvedAt === null).length,
    resolved: all.filter((report) => report.resolvedAt !== null).length,
  }

  const filtered = all.filter((report) =>
    statusFilter === 'open'
      ? report.resolvedAt === null
      : statusFilter === 'resolved'
        ? report.resolvedAt !== null
        : true,
  )

  const reports = await Promise.all(
    filtered.map(async (report) => ({
      ...report,
      photoUrl: report.photoUrl
        ? await getReportPhotoUrl(report.photoUrl)
        : null,
    })),
  )

  return (
    <div className="flex min-h-dvh w-full flex-col bg-canopee-cream">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pb-bottom-nav sm:px-6">
        <header className="sticky top-0 z-30 -mx-4 bg-canopee-cream/95 px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-3 backdrop-blur-sm sm:-mx-6 sm:px-6 flex items-center gap-3">
          <BackButton fallback="/profil" />
          <h1 className="font-heading text-2xl text-canopee-forest sm:text-3xl">
            Signalements
          </h1>
        </header>

        <IssueList
          reports={reports}
          sortBy={sortBy}
          statusFilter={statusFilter}
          counts={counts}
          dateRange={dateRangeValue}
        />
      </main>

      <BottomNav />
    </div>
  )
}
