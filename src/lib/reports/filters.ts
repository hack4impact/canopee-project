import {
  OBSERVATION_CATEGORIES,
  type ObservationCategory,
} from '@/lib/observations/collection'
import {
  REPORT_CATEGORIES,
  REPORT_GROUPS,
  REPORT_GROUP_CATEGORIES,
  type ReportCategory,
  type ReportGroup,
} from '@/lib/reports/categories'
import { PIN_CATEGORIES } from '@/lib/reports/pins'

export type CategorySelection = ReadonlySet<ReportCategory>

export type GroupState = 'all' | 'some' | 'none'

export const FILTER_GROUPS: readonly ReportGroup[] = REPORT_GROUPS

export function categoriesOfGroup(
  group: ReportGroup,
): readonly ReportCategory[] {
  return REPORT_GROUP_CATEGORIES[group]
}

export function allCategoriesSelected(): Set<ReportCategory> {
  return new Set(REPORT_CATEGORIES)
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
  const categories = categoriesOfGroup(group)
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
  const categories = categoriesOfGroup(group)

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
  const chosen = PIN_CATEGORIES.filter((category) => selection.has(category))

  if (chosen.length >= PIN_CATEGORIES.length) {
    return null
  }

  return chosen.join(',')
}
export function selectionToUrlParam(
  selection: CategorySelection,
): string | null {
  if (selection.size >= REPORT_CATEGORIES.length) {
    return null
  }

  return REPORT_CATEGORIES.filter((category) => selection.has(category)).join(
    ',',
  )
}

export function paramToSelection(param: string | null): Set<ReportCategory> {
  if (param === null) {
    return allCategoriesSelected()
  }

  if (param === '') {
    return new Set()
  }

  return new Set(
    param
      .split(',')
      .filter((value): value is ReportCategory =>
        REPORT_CATEGORIES.includes(value as ReportCategory),
      ),
  )
}

export function observationCategoriesOf(
  selection: CategorySelection,
): readonly ObservationCategory[] {
  return OBSERVATION_CATEGORIES.filter((category) => selection.has(category))
}
