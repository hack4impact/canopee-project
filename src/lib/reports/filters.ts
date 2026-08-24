import {
  REPORT_GROUPS,
  REPORT_GROUP_CATEGORIES,
  type ReportCategory,
  type ReportGroup,
} from '@/lib/reports/categories'
import { isPinCategory, PIN_CATEGORIES } from '@/lib/reports/pins'

export type CategorySelection = ReadonlySet<ReportCategory>

export type GroupState = 'all' | 'some' | 'none'

export const PIN_GROUPS: readonly ReportGroup[] = REPORT_GROUPS.filter(
  (group) => REPORT_GROUP_CATEGORIES[group].some(isPinCategory),
)

export function pinCategoriesOfGroup(
  group: ReportGroup,
): readonly ReportCategory[] {
  return REPORT_GROUP_CATEGORIES[group].filter(isPinCategory)
}

export function allCategoriesSelected(): Set<ReportCategory> {
  return new Set(PIN_CATEGORIES)
}

export function toggleCategory(
  selection: CategorySelection,
  category: ReportCategory,
): Set<ReportCategory> {
  const next = new Set(selection)

  if (next.has(category)) {
    next.delete(category)
  } else {
    next.add(category)
  }

  return next
}

export function groupState(
  selection: CategorySelection,
  group: ReportGroup,
): GroupState {
  const categories = pinCategoriesOfGroup(group)
  const chosen = categories.filter((category) => selection.has(category)).length

  if (chosen === 0) {
    return 'none'
  }

  return chosen === categories.length ? 'all' : 'some'
}

export function toggleGroup(
  selection: CategorySelection,
  group: ReportGroup,
): Set<ReportCategory> {
  const next = new Set(selection)
  const categories = pinCategoriesOfGroup(group)

  if (groupState(selection, group) === 'all') {
    for (const category of categories) {
      next.delete(category)
    }
  } else {
    for (const category of categories) {
      next.add(category)
    }
  }

  return next
}

export function selectionToParam(selection: CategorySelection): string | null {
  if (selection.size >= PIN_CATEGORIES.length) {
    return null
  }

  return PIN_CATEGORIES.filter((category) => selection.has(category)).join(',')
}
