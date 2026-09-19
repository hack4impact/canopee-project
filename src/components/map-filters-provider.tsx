'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { DateRangeValue } from '@/components/date-range-filter'
import { lastTwoMonthsRange, toDateParam } from '@/lib/reports/date-range'
import {
  REPORT_GROUPS,
  type ReportCategory,
  type ReportGroup,
} from '@/lib/reports/categories'
import {
  selectionToUrlParam,
  paramToSelection,
  toggleCategory,
  toggleGroup,
  type CategorySelection,
} from '@/lib/reports/filters'

type MapFiltersValue = {
  observations: boolean
  groups: readonly ReportGroup[]
  selection: CategorySelection
  onToggleCategory: (category: ReportCategory) => void
  onToggleGroup: (group: ReportGroup) => void
  heatmapVisible: boolean
  heatmapAvailable: boolean
  onToggleHeatmap: () => void
  onHeatmapAvailable: (available: boolean) => void
  canPickDates: boolean
  dateRange: DateRangeValue
  onDateRangeChange: (range: DateRangeValue) => void
}

const MapFiltersContext = createContext<MapFiltersValue | null>(null)

export function useMapFilters(): MapFiltersValue {
  const value = useContext(MapFiltersContext)

  if (!value) {
    throw new Error('useMapFilters must be used inside a MapFiltersProvider')
  }

  return value
}

export function MapFiltersProvider({
  observations,
  canPickDates = false,
  children,
}: {
  observations: boolean
  canPickDates?: boolean
  children: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [selection, setSelection] = useState<CategorySelection>(() =>
    paramToSelection(searchParams.get('categories')),
  )

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const value = selectionToUrlParam(selection)

    if (value === null) {
      params.delete('categories')
    } else {
      params.set('categories', value)
    }

    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection])

  const [heatmapVisible, setHeatmapVisible] = useState(true)
  const [heatmapAvailable, setHeatmapAvailable] = useState(false)
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => {
    const { from, to } = lastTwoMonthsRange()
    return { from: toDateParam(from), to: toDateParam(to) }
  })

  const onHeatmapAvailable = useCallback(
    (available: boolean) => setHeatmapAvailable(available),
    [],
  )

  const value = useMemo<MapFiltersValue>(
    () => ({
      observations,
      groups: observations
        ? REPORT_GROUPS
        : REPORT_GROUPS.filter((group) => group !== 'faune_flore'),
      selection,
      onToggleCategory: (category) =>
        setSelection((current) => toggleCategory(current, category)),
      onToggleGroup: (group) =>
        setSelection((current) => toggleGroup(current, group)),
      heatmapVisible,
      heatmapAvailable,
      onToggleHeatmap: () => setHeatmapVisible((current) => !current),
      onHeatmapAvailable,
      canPickDates,
      dateRange,
      onDateRangeChange: setDateRange,
    }),
    [
      observations,
      selection,
      heatmapVisible,
      heatmapAvailable,
      onHeatmapAvailable,
      canPickDates,
      dateRange,
    ],
  )

  return <MapFiltersContext value={value}>{children}</MapFiltersContext>
}
