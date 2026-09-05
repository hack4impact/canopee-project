'use client'

import { ChevronRightIcon, ChevronDownIcon, ImageOffIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ReportsCsvExport } from '@/components/reports-csv-export'
import { REPORT_CATEGORY_LABELS } from '@/lib/reports/categories'
import { formatEventNumber } from '@/lib/reports/format'
import { reportGroupColor } from '@/lib/reports/group-style'
import { sectionReports } from '@/lib/reports/history'
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
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({})

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

  const groupedReports =
    sortBy === 'wooded' ? sectionReports(reports, 'wooded') : null

  function toggleSection(key: string) {
    setCollapsedSections((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

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
      </div>

      {reports.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-canopee-forest/25 px-5 py-10 text-center text-sm text-canopee-forest/70">
          Aucun signalement dans ce filtre.
        </p>
      ) : groupedReports ? (
        <div className="flex flex-col gap-3">
          {groupedReports.map((section) => (
            <section key={section.key} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-0.5">
                <button
                  type="button"
                  onClick={() => toggleSection(section.key)}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  <span className="text-canopee-forest/60">
                    {collapsedSections[section.key] ? (
                      <ChevronRightIcon className="size-4" />
                    ) : (
                      <ChevronDownIcon className="size-4" />
                    )}
                  </span>
                  <h3 className="text-[11px] font-extrabold tracking-[0.12em] text-canopee-forest/50 uppercase">
                    {section.label}
                  </h3>
                  <span className="h-px flex-1 bg-canopee-forest/12" />
                  <span className="text-[11px] font-bold text-canopee-forest/35 tabular-nums">
                    {section.items.length}
                  </span>
                </button>
              </div>

              {!collapsedSections[section.key] && (
                <ul className="flex flex-col gap-2">
                  {section.items.map((report) => {
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
                            <span className="truncate text-[11px] font-semibold text-canopee-forest/55">
                              {report.woodedArea ?? 'Autre'}
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
            </section>
          ))}
        </div>
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
                    <span className="truncate text-[11px] font-semibold text-canopee-forest/55">
                      {report.woodedArea ?? 'Autre'}
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
