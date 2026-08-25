'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  REPORT_GROUPS,
  type ReportCategory,
  type ReportGroup,
} from '@/lib/reports/categories'
import {
  allCategoriesSelected,
  toggleCategory,
  toggleGroup,
  type CategorySelection,
} from '@/lib/reports/filters'

type MapFiltersValue = {
  groups: readonly ReportGroup[]
  selection: CategorySelection
  onToggleCategory: (category: ReportCategory) => void
  onToggleGroup: (group: ReportGroup) => void
  heatmapVisible: boolean
  heatmapAvailable: boolean
  onToggleHeatmap: () => void
  onHeatmapAvailable: (available: boolean) => void
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
  children,
}: {
  observations: boolean
  children: ReactNode
}) {
  const [selection, setSelection] = useState<CategorySelection>(
    allCategoriesSelected,
  )
  const [heatmapVisible, setHeatmapVisible] = useState(true)
  const [heatmapAvailable, setHeatmapAvailable] = useState(false)

  const onHeatmapAvailable = useCallback(
    (available: boolean) => setHeatmapAvailable(available),
    [],
  )

  const value = useMemo<MapFiltersValue>(
    () => ({
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
    }),
    [
      observations,
      selection,
      heatmapVisible,
      heatmapAvailable,
      onHeatmapAvailable,
    ],
  )

  return <MapFiltersContext value={value}>{children}</MapFiltersContext>
}
