'use client'

import { ImageOffIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ReportsCsvExport } from '@/components/reports-csv-export'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { REPORT_CATEGORY_LABELS } from '@/lib/reports/categories'
import { formatEventNumber } from '@/lib/reports/format'
import { reportGroupColor } from '@/lib/reports/group-style'
import type {
  ReportListItem,
  ReportSortBy,
  ReportStatusFilter,
} from '@/lib/reports/queries'

const dateFormatter = new Intl.DateTimeFormat('fr-CA', {
  day: 'numeric',
  month: 'short',
  timeZone: 'America/Toronto',
})

const SORT_LABELS: Record<ReportSortBy, string> = {
  date: 'Récents',
  status: 'Statut',
}

export function IssueList({
  reports,
  sortBy,
  statusFilter,
  counts,
}: {
  reports: ReportListItem[]
  sortBy: ReportSortBy
  statusFilter: ReportStatusFilter
  counts: { all: number; open: number; resolved: number }
}) {
  const router = useRouter()

  function go(next: {
    sortBy?: ReportSortBy
    statusFilter?: ReportStatusFilter
  }) {
    const params = new URLSearchParams({
      sortBy: next.sortBy ?? sortBy,
      statusFilter: next.statusFilter ?? statusFilter,
    })

    router.replace(`/admin/issues?${params.toString()}`)
  }

  const tabs: { value: ReportStatusFilter; label: string; n: number }[] = [
    { value: 'open', label: 'À traiter', n: counts.open },
    { value: 'resolved', label: 'Résolus', n: counts.resolved },
    { value: 'all', label: 'Tous', n: counts.all },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1 rounded-[10px] bg-canopee-forest/8 p-[3px]">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => go({ statusFilter: tab.value })}
              aria-pressed={tab.value === statusFilter}
              className={`flex-1 rounded-md py-1.5 text-center text-xs font-bold tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-canopee-green focus-visible:outline-none ${
                tab.value === statusFilter
                  ? 'bg-canopee-forest text-canopee-cream'
                  : 'text-canopee-forest/60 hover:text-canopee-forest'
              }`}
            >
              {tab.label} {tab.n}
            </button>
          ))}
        </div>

        <Select
          value={sortBy}
          onValueChange={(value) => go({ sortBy: value as ReportSortBy })}
        >
          <SelectTrigger
            size="sm"
            aria-label="Trier les signalements"
            className="w-auto shrink-0 font-bold text-canopee-forest"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {(Object.keys(SORT_LABELS) as ReportSortBy[]).map((value) => (
              <SelectItem key={value} value={value}>
                {SORT_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {reports.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-canopee-forest/25 px-5 py-10 text-center text-sm text-canopee-forest/70">
          Aucun signalement dans ce filtre.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {reports.map((report) => {
            const resolved = report.resolvedAt !== null

            return (
              <li key={report.id}>
                <Link
                  href={`/admin/issues/${report.id}`}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-canopee-green focus-visible:outline-none ${
                    resolved
                      ? 'border-dashed border-canopee-forest/15 hover:border-canopee-forest/30'
                      : 'border-canopee-forest/10 bg-white/70 hover:border-canopee-green/40'
                  }`}
                >
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-canopee-forest/5">
                    {report.photoUrl ? (
                      <Image
                        src={report.photoUrl}
                        alt=""
                        width={96}
                        height={96}
                        className={`h-full w-full object-cover ${resolved ? 'opacity-55' : ''}`}
                      />
                    ) : (
                      <ImageOffIcon
                        aria-label="Aucune photo"
                        className="absolute top-1/2 left-1/2 size-5 -translate-x-1/2 -translate-y-1/2"
                        style={{
                          color: reportGroupColor(report.category),
                          opacity: resolved ? 0.35 : 0.55,
                        }}
                      />
                    )}
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col">
                    <span
                      className={`truncate font-heading text-sm ${
                        resolved
                          ? 'text-canopee-forest/70'
                          : 'text-canopee-forest'
                      }`}
                    >
                      {REPORT_CATEGORY_LABELS[report.category]}
                    </span>
                    <span className="truncate text-xs text-canopee-forest/60 tabular-nums">
                      {formatEventNumber(report.eventNumber)} ·{' '}
                      {dateFormatter.format(report.createdAt)} ·{' '}
                      {report.reporter}
                    </span>
                  </span>

                  <span
                    className={`shrink-0 text-[11px] font-extrabold tracking-[0.04em] ${
                      resolved
                        ? 'text-canopee-forest/45'
                        : 'text-canopee-coral-dark'
                    }`}
                  >
                    {resolved ? 'Résolu' : 'En attente'}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <ReportsCsvExport />
    </div>
  )
}
