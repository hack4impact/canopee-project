import type { ReportCategory } from '@/lib/reports/categories'

export const REPORT_HISTORY_STATUSES = ['all', 'open', 'resolved'] as const

export type ReportHistoryStatus = (typeof REPORT_HISTORY_STATUSES)[number]

export const DEFAULT_HISTORY_STATUS: ReportHistoryStatus = 'all'

export const REPORT_HISTORY_SORTS = ['recent', 'oldest', 'wooded'] as const

export type ReportHistorySort = (typeof REPORT_HISTORY_SORTS)[number]

export const DEFAULT_HISTORY_SORT: ReportHistorySort = 'wooded'

export const REPORT_HISTORY_SORT_LABELS: Record<ReportHistorySort, string> = {
  recent: 'Récents',
  oldest: 'Anciens',
  wooded: 'Boisé',
}

export function parseHistoryStatus(
  value: string | null | undefined,
): ReportHistoryStatus {
  const normalized = value?.trim().toLowerCase()

  return REPORT_HISTORY_STATUSES.includes(normalized as ReportHistoryStatus)
    ? (normalized as ReportHistoryStatus)
    : DEFAULT_HISTORY_STATUS
}

export function parseHistorySort(
  value: string | null | undefined,
): ReportHistorySort {
  const normalized = value?.trim().toLowerCase()

  return REPORT_HISTORY_SORTS.includes(normalized as ReportHistorySort)
    ? (normalized as ReportHistorySort)
    : DEFAULT_HISTORY_SORT
}

const monthFormatter = new Intl.DateTimeFormat('fr-CA', {
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Toronto',
})

export function formatMonthLabel(date: Date): string {
  const label = monthFormatter.format(date)

  return label.charAt(0).toUpperCase() + label.slice(1)
}

export type SectionedReport = {
  category: ReportCategory
  createdAt: Date
  woodedArea?: string | null
}

export function sortReportsByHistory<T extends SectionedReport>(
  items: readonly T[],
  sort: ReportHistorySort,
): T[] {
  const sorted = [...items]

  if (sort === 'oldest') {
    sorted.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    return sorted
  }

  if (sort === 'recent') {
    sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    return sorted
  }

  sorted.sort((a, b) => {
    const leftName = a.woodedArea ?? 'Autre'
    const rightName = b.woodedArea ?? 'Autre'

    const leftIsOther = leftName === 'Autre'
    const rightIsOther = rightName === 'Autre'

    if (leftIsOther && !rightIsOther) {
      return 1
    }

    if (!leftIsOther && rightIsOther) {
      return -1
    }

    const woodedAreaComparison = leftName.localeCompare(rightName, 'fr', {
      sensitivity: 'base',
    })

    if (woodedAreaComparison !== 0) {
      return woodedAreaComparison
    }

    return b.createdAt.getTime() - a.createdAt.getTime()
  })

  return sorted
}

export type ReportSection<T extends SectionedReport> = {
  key: string
  label: string
  items: T[]
}

export function sectionReports<T extends SectionedReport>(
  items: readonly T[],
  sort: ReportHistorySort,
): ReportSection<T>[] {
  const sections: ReportSection<T>[] = []
  const sortedItems = sortReportsByHistory(items, sort)

  for (const item of sortedItems) {
    const label =
      sort === 'wooded'
        ? (item.woodedArea ?? 'Autre')
        : formatMonthLabel(item.createdAt)

    const key = sort === 'wooded' ? (item.woodedArea ?? 'Autre') : label

    const current = sections.at(-1)

    if (current?.key === key) {
      current.items.push(item)
      continue
    }

    sections.push({ key, label, items: [item] })
  }

  return sections
}
