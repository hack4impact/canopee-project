'use client'

import { useState } from 'react'
import { ChevronDownIcon, DownloadIcon } from 'lucide-react'
import {
  CSV_COLUMN_GROUPS,
  CSV_HEADER_LABELS,
  CSV_HEADERS,
  type CsvColumn,
} from '@/lib/reports/csv'

const EXPORT_URL = '/api/reports/export'

function fileNameFromResponse(response: Response): string {
  const header = response.headers.get('Content-Disposition') ?? ''
  const match = header.match(/filename="([^"]+)"/)
  return match?.[1] ?? 'signalements-export.csv'
}

export function ReportsCsvExport() {
  const [selected, setSelected] = useState<Set<CsvColumn>>(
    () => new Set(CSV_HEADERS),
  )
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleGroup(columns: readonly CsvColumn[]) {
    setSelected((current) => {
      const next = new Set(current)
      const all = columns.every((column) => next.has(column))
      for (const column of columns) {
        if (all) {
          next.delete(column)
        } else {
          next.add(column)
        }
      }
      return next
    })
  }

  function toggleColumn(column: CsvColumn) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(column)) {
        next.delete(column)
      } else {
        next.add(column)
      }
      return next
    })
  }

  async function handleExport() {
    if (selected.size === 0) {
      return
    }

    setPending(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (selected.size < CSV_HEADERS.length) {
        const columns = CSV_HEADERS.filter((column) => selected.has(column))
        params.set('columns', columns.join(','))
      }

      const url = params.size > 0 ? `${EXPORT_URL}?${params}` : EXPORT_URL
      const response = await fetch(url, { redirect: 'manual' })

      if (!response.ok) {
        throw new Error(`Export failed (${response.status})`)
      }

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = fileNameFromResponse(response)
      link.click()
      URL.revokeObjectURL(objectUrl)
    } catch {
      setError("Impossible d'exporter les signalements")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="rounded-2xl border border-canopee-forest/10 bg-white/70 shadow-sm">
      <div className="flex items-center gap-2 p-2 pl-3">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls="csv-columns"
          className="flex min-h-11 flex-1 touch-manipulation items-center gap-1.5 rounded-lg text-left text-[13px] font-semibold text-canopee-forest transition-colors hover:text-canopee-green focus-visible:ring-2 focus-visible:ring-canopee-green focus-visible:outline-none"
        >
          {selected.size} colonne{selected.size === 1 ? '' : 's'}
          <ChevronDownIcon
            aria-hidden="true"
            className={`size-3.5 shrink-0 text-canopee-forest/45 transition-transform duration-150 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>

        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={pending || selected.size === 0}
          className="inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-lg bg-canopee-green px-4 text-[13px] font-bold text-white transition-colors hover:bg-canopee-forest focus-visible:ring-2 focus-visible:ring-canopee-green focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <DownloadIcon aria-hidden="true" className="size-4 shrink-0" />
          {pending ? 'Export…' : 'Exporter'}
        </button>
      </div>

      {open && (
        <div id="csv-columns" className="border-t border-canopee-forest/10">
          {CSV_COLUMN_GROUPS.map(({ label, columns }, index) => {
            const picked = columns.filter((column) => selected.has(column))
            const partial = picked.length > 0 && picked.length < columns.length
            const isExpanded = expanded === label

            return (
              <div
                key={label}
                className={
                  index > 0 ? 'border-t border-canopee-forest/8' : undefined
                }
              >
                <div className="flex items-center gap-3 px-3">
                  <input
                    type="checkbox"
                    aria-label={`Tout cocher dans ${label}`}
                    checked={picked.length === columns.length}
                    ref={(element) => {
                      if (element) {
                        element.indeterminate = partial
                      }
                    }}
                    onChange={() => toggleGroup(columns)}
                    className="size-4 shrink-0 accent-canopee-green"
                  />
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : label)}
                    aria-expanded={isExpanded}
                    aria-controls={`csv-group-list-${label}`}
                    className="flex min-h-11 flex-1 touch-manipulation items-center gap-2 rounded-lg text-left focus-visible:ring-2 focus-visible:ring-canopee-green focus-visible:outline-none"
                  >
                    <span className="flex-1 text-[13px] font-semibold text-canopee-forest">
                      {label}
                    </span>
                    {partial && (
                      <span className="text-[11px] font-medium text-canopee-forest/45 tabular-nums">
                        {picked.length} sur {columns.length}
                      </span>
                    )}
                    <ChevronDownIcon
                      aria-hidden="true"
                      className={`size-3.5 shrink-0 text-canopee-forest/40 transition-transform duration-150 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </div>

                {isExpanded && (
                  <ul
                    id={`csv-group-list-${label}`}
                    className="flex flex-col gap-3 pb-3.5 pl-10"
                  >
                    {columns.map((column) => (
                      <li key={column}>
                        <label className="flex items-start gap-2.5 text-[13px] leading-snug text-canopee-forest/85">
                          <input
                            type="checkbox"
                            checked={selected.has(column)}
                            onChange={() => toggleColumn(column)}
                            className="mt-px size-4 shrink-0 accent-canopee-green"
                          />
                          {CSV_HEADER_LABELS[column]}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}

      {error && (
        <p
          aria-live="polite"
          className="border-t border-canopee-forest/10 px-3 py-2 text-sm text-canopee-coral"
        >
          {error}
        </p>
      )}
    </div>
  )
}
