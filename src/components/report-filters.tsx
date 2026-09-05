'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { FaunaFloraExportButton } from '@/components/fauna-flora-export-button'
import { useMapFilters } from '@/components/map-filters-provider'
import {
  REPORT_CATEGORY_LABELS,
  REPORT_GROUP_LABELS,
  type ReportGroup,
} from '@/lib/reports/categories'
import { categoriesOfGroup, groupState } from '@/lib/reports/filters'
import { REPORT_GROUP_COLORS } from '@/lib/reports/group-style'

export function ReportFilters() {
  const {
    observations,
    groups,
    selection,
    onToggleCategory,
    onToggleGroup,
    heatmapVisible,
    heatmapAvailable,
    onToggleHeatmap,
  } = useMapFilters()
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<ReportGroup | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    function dismiss(event: PointerEvent) {
      const target = event.target as Node

      if (
        !buttonRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="report-filters-panel"
        aria-label="Filtrer les signalements par catégorie"
        className="absolute top-[calc(4.75rem+env(safe-area-inset-top))] left-4 z-20 touch-manipulation rounded-2xl bg-canopee-forest/80 p-3 shadow-xl shadow-black/30 ring-1 ring-white/10 backdrop-blur-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-canopee-forest focus-visible:ring-2 focus-visible:ring-canopee-lime focus-visible:outline-none active:scale-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        <Image
          src="/pictos/filter.svg"
          alt=""
          width={24}
          height={24}
          unoptimized
          className="size-6 brightness-0 invert"
        />
      </button>

      {open && (
        <section
          ref={panelRef}
          id="report-filters-panel"
          className="absolute top-[calc(8.5rem+env(safe-area-inset-top))] left-4 z-10 w-64 space-y-1 rounded-2xl bg-canopee-forest/80 p-3 text-canopee-cream shadow-xl shadow-black/30 ring-1 ring-white/10 backdrop-blur-sm"
        >
          {groups.map((group) => {
            const categories = categoriesOfGroup(group)
            const state = groupState(selection, group)
            const isExpanded = expanded === group

            return (
              <div key={group}>
                <div className="flex items-center gap-3 px-1 py-1.5">
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
                    style={{ accentColor: REPORT_GROUP_COLORS[group] }}
                    className="size-5 shrink-0"
                  />
                  <label
                    htmlFor={`filter-group-${group}`}
                    className="flex-1 text-base font-medium"
                  >
                    {REPORT_GROUP_LABELS[group]}
                  </label>
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : group)}
                    aria-expanded={isExpanded}
                    aria-controls={`filter-list-${group}`}
                    className="touch-manipulation rounded-md px-2 py-1 text-sm font-medium text-canopee-cream/70 transition-colors hover:bg-white/10 hover:text-canopee-cream focus-visible:ring-2 focus-visible:ring-canopee-lime focus-visible:outline-none"
                  >
                    {categories.length} {isExpanded ? '▾' : '▸'}
                  </button>
                </div>

                {isExpanded && (
                  <ul
                    id={`filter-list-${group}`}
                    className="max-h-64 space-y-2.5 overflow-y-auto py-2 pl-8"
                  >
                    {categories.map((category) => (
                      <li
                        key={category}
                        className="flex items-start gap-2.5 pr-2"
                      >
                        <input
                          id={`filter-category-${category}`}
                          type="checkbox"
                          checked={selection.has(category)}
                          onChange={() => onToggleCategory(category)}
                          style={{ accentColor: REPORT_GROUP_COLORS[group] }}
                          className="mt-0.5 size-4 shrink-0"
                        />
                        <label
                          htmlFor={`filter-category-${category}`}
                          className="text-sm leading-snug"
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

          {heatmapAvailable && (
            <div className="mt-2 border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={onToggleHeatmap}
                aria-pressed={heatmapVisible}
                className="w-full touch-manipulation rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-canopee-cream transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-canopee-lime focus-visible:outline-none"
              >
                {heatmapVisible
                  ? 'Masquer la carte de chaleur'
                  : 'Afficher la carte de chaleur'}
              </button>
            </div>
          )}

          {observations && <FaunaFloraExportButton />}
        </section>
      )}
    </>
  )
}
