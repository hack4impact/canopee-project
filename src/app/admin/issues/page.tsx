import { requireApprovedAccess } from '@/lib/auth/current-user'
import {
  listAllReports,
  type ReportSortBy,
  type ReportStatusFilter,
} from '@/lib/reports/queries'
import { IssueList } from './issue-list'
import { getReportPhotoUrl } from '@/lib/reports/photo'

export const dynamic = 'force-dynamic'

export default async function AdminIssuesPage({
  searchParams,
}: {
  searchParams: Promise<{ sortBy?: string; statusFilter?: string }>
}) {
  await requireApprovedAccess('pro')

  const params = await searchParams
  const sortBy: ReportSortBy = params.sortBy === 'status' ? 'status' : 'date'
  const statusFilter: ReportStatusFilter =
    params.statusFilter === 'open' || params.statusFilter === 'resolved'
      ? params.statusFilter
      : 'all'

  const rawReports = await listAllReports({ sortBy, statusFilter })

  const reports = await Promise.all(
    rawReports.map(async (report) => ({
      ...report,
      photoUrl: report.photoUrl
        ? await getReportPhotoUrl(report.photoUrl)
        : null,
    })),
  )

  return (
    <div className="flex min-h-dvh w-full flex-col bg-canopee-cream">
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-32 sm:px-6">
        <header className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl text-canopee-forest sm:text-3xl">
            Signalements ({reports.length})
          </h1>
        </header>

        <IssueList
          reports={reports}
          sortBy={sortBy}
          statusFilter={statusFilter}
        />
      </main>
    </div>
  )
}
