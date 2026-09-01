'use client'

import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'

import { REPORT_CATEGORY_LABELS } from '@/lib/reports/categories'
import type {
  ReportListItem,
  ReportSortBy,
  ReportStatusFilter,
} from '@/lib/reports/queries'

import { formatEventNumber } from '@/lib/reports/format'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ReportsCsvExport } from '@/components/reports-csv-export'

const CARD = 'rounded-2xl border border-canopee-forest/10 bg-white/70 shadow-sm'

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function IssueList({
  reports,
  sortBy,
  statusFilter,
}: {
  reports: ReportListItem[]
  sortBy: ReportSortBy
  statusFilter: ReportStatusFilter
}) {
  const router = useRouter()
  const pathname = usePathname()

  function updateParams(next: {
    sortBy?: ReportSortBy
    statusFilter?: ReportStatusFilter
  }) {
    const params = new URLSearchParams({
      sortBy: next.sortBy ?? sortBy,
      statusFilter: next.statusFilter ?? statusFilter,
    })
    router.push(`${pathname}?${params.toString()}`)
  }

  const filters = (
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-canopee-forest">
          Trier par
        </label>
        <Select
          value={sortBy}
          onValueChange={(value) =>
            updateParams({ sortBy: value as ReportSortBy })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="status">Statut</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-canopee-forest">
          Filtrer par statut
        </label>
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            updateParams({ statusFilter: value as ReportStatusFilter })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="open">En attente</SelectItem>
            <SelectItem value="resolved">Résolu</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <ReportsCsvExport />
      {filters}
      {reports.length === 0 ? (
        <p
          className={`px-5 py-8 text-center text-sm text-canopee-coral ${CARD}`}
        >
          Aucun signalement pour le moment.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reports.map((report) => (
            <li
              key={report.id}
              className={`flex items-center gap-4 px-4 py-3 ${CARD}`}
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-canopee-forest/5">
                {report.photoUrl ? (
                  <Image
                    src={report.photoUrl}
                    alt=""
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-heading text-sm text-canopee-coral-dark">
                  {REPORT_CATEGORY_LABELS[report.category]}
                </span>
                <span className="text-xs text-canopee-coral">
                  {formatEventNumber(report.eventNumber)} ·{' '}
                  {formatDate(report.createdAt)}
                </span>
              </div>

              <span
                className={`shrink-0 rounded-md px-3 py-1 text-xs font-semibold ${
                  report.resolvedAt
                    ? 'text-canopee-forest'
                    : 'text-canopee-coral'
                }`}
              >
                {report.resolvedAt ? 'Résolu' : 'En attente'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
