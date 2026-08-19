// Type-only import: erased at build time, so this module stays free of the
// Drizzle runtime and can be imported from Client Components.
import type { reportCategoryEnum } from '@/db/schema'

export type ReportCategory = (typeof reportCategoryEnum.enumValues)[number]

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  dangerous_tree: 'Arbre dangereux',
  damaged_infrastructure: 'Infrastructure endommagée',
  fauna_observation: 'Observation de faune',
  flora_observation: 'Observation de flore',
  unleashed_dog: 'Chien sans laisse',
}

export const REPORT_CATEGORIES = Object.keys(
  REPORT_CATEGORY_LABELS,
) as ReportCategory[]

export function isReportCategory(value: unknown): value is ReportCategory {
  return (
    typeof value === 'string' && Object.hasOwn(REPORT_CATEGORY_LABELS, value)
  )
}
