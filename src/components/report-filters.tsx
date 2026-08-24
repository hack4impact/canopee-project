'use client'

import { useState } from 'react'
import {
  REPORT_CATEGORY_LABELS,
  REPORT_GROUP_LABELS,
  type ReportCategory,
  type ReportGroup,
} from '@/lib/reports/categories'
import {
  groupState,
  pinCategoriesOfGroup,
  PIN_GROUPS,
  type CategorySelection,
} from '@/lib/reports/filters'

export function ReportFilters({
  selection,
  onToggleCategory,
  onToggleGroup,
  className,
}: {
  selection: CategorySelection
  onToggleCategory: (category: ReportCategory) => void
  onToggleGroup: (group: ReportGroup) => void
  className?: string
}) {
  const [expanded, setExpanded] = useState<ReportGroup | null>(null)

  return (
    <section
      aria-label="Filtrer les signalements par catégorie"
      className={`w-60 rounded-2xl bg-canopee-forest/80 p-2 text-canopee-cream shadow-xl shadow-black/30 ring-1 ring-white/10 backdrop-blur-sm ${className ?? ''}`}
    >
      {PIN_GROUPS.map((group) => {
        const categories = pinCategoriesOfGroup(group)
        const state = groupState(selection, group)
        const isExpanded = expanded === group

        return (
          <div key={group}>
            <div className="flex items-center gap-2 px-1.5 py-1">
              <input
                id={`filter-group-${group}`}
                type="checkbox"
                checked={state === 'all'}
                ref={(element) => {
                  if (element) {
                    element.indeterminate = state === 'some'
                  }
                }}
                onChange={() => onToggleGroup(group)}
                className="size-4 shrink-0 accent-canopee-lime"
              />
              <label
                htmlFor={`filter-group-${group}`}
                className="flex-1 text-sm font-medium"
              >
                {REPORT_GROUP_LABELS[group]}
              </label>
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : group)}
                aria-expanded={isExpanded}
                aria-controls={`filter-list-${group}`}
                className="touch-manipulation rounded-md px-1.5 py-0.5 text-xs font-medium text-canopee-cream/70 transition-colors hover:bg-white/10 hover:text-canopee-cream focus-visible:ring-2 focus-visible:ring-canopee-lime focus-visible:outline-none"
              >
                {categories.length} {isExpanded ? '▾' : '▸'}
              </button>
            </div>

            {isExpanded && (
              <ul
                id={`filter-list-${group}`}
                className="max-h-56 space-y-0.5 overflow-y-auto py-1 pl-6"
              >
                {categories.map((category) => (
                  <li key={category} className="flex items-start gap-2 pr-1.5">
                    <input
                      id={`filter-category-${category}`}
                      type="checkbox"
                      checked={selection.has(category)}
                      onChange={() => onToggleCategory(category)}
                      className="mt-0.5 size-3.5 shrink-0 accent-canopee-lime"
                    />
                    <label
                      htmlFor={`filter-category-${category}`}
                      className="text-xs leading-snug"
                    >
                      {REPORT_CATEGORY_LABELS[category]}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </section>
  )
}
