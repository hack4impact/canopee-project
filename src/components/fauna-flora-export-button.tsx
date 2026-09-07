'use client'

import { useState } from 'react'
import { DownloadIcon } from 'lucide-react'
import {
  DateRangePicker,
  currentYearRange,
  toDateParam,
  type DateRange,
} from '@/components/date-range-picker'

const EXPORT_URL = '/api/fauna-flora/export'

function fileNameFromResponse(response: Response): string {
  const header = response.headers.get('Content-Disposition') ?? ''
  const match = header.match(/filename="([^"]+)"/)
  return match?.[1] ?? 'signalements-faune-flore.csv'
}

export function FaunaFloraExportButton({
  columnCount,
}: {
  columnCount: number
}) {
  const [range, setRange] = useState<DateRange>(currentYearRange)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExport() {
    setPending(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('startDate', toDateParam(range.from))
      params.set('endDate', toDateParam(range.to))

      const response = await fetch(`${EXPORT_URL}?${params}`, {
        redirect: 'manual',
      })

      if (!response.ok) {
        throw new Error(`Export failed (${response.status})`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileNameFromResponse(response)
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      setError("Impossible d'exporter les données faune et flore")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="rounded-2xl border border-canopee-forest/10 bg-white/70 shadow-sm">
      <div className="border-b border-canopee-forest/10 px-3 py-2.5">
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      <div className="flex items-center gap-2 p-2 pl-3">
        <p className="min-h-11 flex-1 content-center text-[13px] font-semibold text-canopee-forest">
          Format ministère · {columnCount} colonnes
        </p>

        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={pending}
          className="inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-lg bg-canopee-green px-4 text-[13px] font-bold text-white transition-colors hover:bg-canopee-forest focus-visible:ring-2 focus-visible:ring-canopee-green focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <DownloadIcon aria-hidden="true" className="size-4 shrink-0" />
          {pending ? 'Export…' : 'Exporter'}
        </button>
      </div>

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
