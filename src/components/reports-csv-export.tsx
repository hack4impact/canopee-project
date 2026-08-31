'use client'

import { useState } from 'react'
import { CSV_HEADERS, type CsvColumn } from '@/lib/reports/csv'

const EXPORT_URL = '/api/reports/export'

const COLUMN_LABELS: Record<CsvColumn, string> = {
  category: 'Catégorie',
  category_label: 'Libellé de la catégorie',
  typology: 'Typologie',
  species: 'Nom commun',
  latitude: 'Latitude',
  longitude: 'Longitude',
  created_at: "Date de l'observation",
  reporter: 'Observateurs/observatrices',
  description: 'Commentaires',
  habitat: 'Habitat',
  quantity: 'Nombre observé',
  unit: 'Unité associée au nombre',
  photo_url: 'Nom du fichier',
  statut: 'Statut provincial',
  status: 'Statut observateur',
  resolved_at: 'Date de résolution',
  event_number: 'Numéro de signalement unique',
}

const COLUMN_ORDER: readonly CsvColumn[] = [
  'category',
  'category_label',
  'typology',
  'species',
  'latitude',
  'longitude',
  'created_at',
  'reporter',
  'description',
  'habitat',
  'quantity',
  'unit',
  'photo_url',
  'statut',
  'status',
  'resolved_at',
  'event_number',
]

function fileNameFromResponse(response: Response): string {
  const header = response.headers.get('Content-Disposition') ?? ''
  const match = header.match(/filename="([^"]+)"/)
  return match?.[1] ?? 'signalements-export.csv'
}

export function ReportsCsvExport() {
  const [selected, setSelected] = useState<Set<CsvColumn>>(
    () => new Set(CSV_HEADERS),
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    <div className="rounded-2xl border border-canopee-forest/10 bg-white/70 p-4 shadow-sm">
      <p className="text-sm font-medium text-canopee-forest">Colonnes</p>

      <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {COLUMN_ORDER.map((column) => (
          <li key={column}>
            <label className="flex items-start gap-2 text-sm text-canopee-forest">
              <input
                type="checkbox"
                checked={selected.has(column)}
                onChange={() => toggleColumn(column)}
                className="mt-0.5 size-4 shrink-0 accent-canopee-green"
              />
              {COLUMN_LABELS[column]}
            </label>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => void handleExport()}
        disabled={pending || selected.size === 0}
        className="mt-4 rounded-lg bg-canopee-green px-4 py-2 text-sm font-bold text-white hover:bg-canopee-forest disabled:opacity-50"
      >
        {pending ? 'Export en cours…' : 'Exporter en CSV'}
      </button>

      {error && (
        <p aria-live="polite" className="mt-2 text-sm text-canopee-coral">
          {error}
        </p>
      )}
    </div>
  )
}
