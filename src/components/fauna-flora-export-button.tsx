'use client'

import { useState } from 'react'

const EXPORT_URL = '/api/fauna-flora/export'

function fileNameFromResponse(response: Response): string {
  const header = response.headers.get('Content-Disposition') ?? ''
  const match = header.match(/filename="([^"]+)"/)
  return match?.[1] ?? 'signalements-faune-flore.csv'
}

export function FaunaFloraExportButton() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExport() {
    setPending(true)
    setError(null)

    try {
      const response = await fetch(EXPORT_URL, { redirect: 'manual' })

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
    <div className="mt-2 border-t border-white/10 pt-3">
      <button
        type="button"
        onClick={() => void handleExport()}
        disabled={pending}
        className="w-full touch-manipulation rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-canopee-cream transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-canopee-lime focus-visible:outline-none disabled:opacity-50"
      >
        {pending ? 'Export en cours…' : 'Exporter faune/flore'}
      </button>
      {error && (
        <p aria-live="polite" className="mt-2 text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}
