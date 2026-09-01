import {
  reportGroupOfCategory,
  REPORT_GROUP_LABELS,
  type ReportCategory,
} from '@/lib/reports/categories'

export const REPORT_HISTORY_STATUSES = ['all', 'open', 'resolved'] as const

export type ReportHistoryStatus = (typeof REPORT_HISTORY_STATUSES)[number]

export const DEFAULT_HISTORY_STATUS: ReportHistoryStatus = 'all'

export const REPORT_HISTORY_SORTS = ['recent', 'oldest', 'category'] as const

export type ReportHistorySort = (typeof REPORT_HISTORY_SORTS)[number]

export const DEFAULT_HISTORY_SORT: ReportHistorySort = 'recent'

export const REPORT_HISTORY_SORT_LABELS: Record<ReportHistorySort, string> = {
  recent: 'Récents',
  oldest: 'Anciens',
  category: 'Catégorie',
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

  for (const item of items) {
    const label =
      sort === 'category'
        ? REPORT_GROUP_LABELS[reportGroupOfCategory(item.category)]
        : formatMonthLabel(item.createdAt)

    const key =
      sort === 'category' ? reportGroupOfCategory(item.category) : label

    const current = sections.at(-1)

    if (current?.key === key) {
      current.items.push(item)
      continue
    }

    sections.push({ key, label, items: [item] })
  }

  return sections
}
