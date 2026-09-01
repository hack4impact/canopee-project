import {
  REPORT_CATEGORY_LABELS,
  type ReportCategory,
} from '@/lib/reports/categories'

export type ReportExportRow = {
  eventNumber: number
  category: ReportCategory
  description: string | null
  typology: string | null
  quantity: number | null
  species: string | null
  unit: string | null
  habitat: string | null
  statut: string | null
  latitude: number
  longitude: number
  photoUrl: string | null
  createdAt: Date
  resolvedAt: Date | null
  reporter: string | null
}

export type CsvValue = string | number | null

export const CSV_HEADERS = [
  'event_number',
  'created_at',
  'status',
  'resolved_at',
  'category',
  'category_label',
  'description',
  'typology',
  'quantity',
  'unit',
  'species',
  'habitat',
  'statut',
  'latitude',
  'longitude',
  'photo_url',
  'reporter',
] as const

export type CsvColumn = (typeof CSV_HEADERS)[number]

export const CSV_HEADER_LABELS: Record<CsvColumn, string> = {
  event_number: 'Numéro de signalement unique',
  created_at: "Date de l'observation",
  status: 'Statut observateur',
  resolved_at: 'Date de résolution',
  category: 'Catégorie',
  category_label: 'Libellé de la catégorie',
  description: 'Commentaires',
  typology: 'Typologie',
  quantity: 'Nombre observé',
  unit: 'Unité associée au nombre',
  species: 'Nom commun',
  habitat: 'Habitat',
  statut: 'Statut provincial',
  latitude: 'Latitude',
  longitude: 'Longitude',
  photo_url: 'Nom du fichier',
  reporter: 'Observateurs/observatrices',
}

export type ParsedColumns =
  { ok: true; columns: readonly CsvColumn[] } | { ok: false; value: string }

export function isCsvColumn(value: string): value is CsvColumn {
  return (CSV_HEADERS as readonly string[]).includes(value)
}

export function parseColumnsParam(
  value: string | null | undefined,
): ParsedColumns {
  if (value === null || value === undefined || value.trim() === '') {
    return { ok: true, columns: CSV_HEADERS }
  }

  const requested = value
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part !== '')

  if (requested.length === 0) {
    return { ok: true, columns: CSV_HEADERS }
  }

  const unknown = requested.find((part) => !isCsvColumn(part))

  if (unknown !== undefined) {
    return { ok: false, value: unknown }
  }

  const chosen = new Set(requested as CsvColumn[])

  return {
    ok: true,
    columns: CSV_HEADERS.filter((column) => chosen.has(column)),
  }
}

/** Excel and LibreOffice need it to read the French labels as UTF-8. */
export const CSV_BOM = '\uFEFF'

const ROW_SEPARATOR = '\r\n'

const NEEDS_QUOTING = /["\n\r,]/

const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r']

/** Stops a spreadsheet from evaluating public-submitted text as a formula. */
function defuse(value: string): string {
  return FORMULA_PREFIXES.some((prefix) => value.startsWith(prefix))
    ? `'${value}`
    : value
}

export function escapeField(value: string): string {
  return NEEDS_QUOTING.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

export function toCell(value: CsvValue): string {
  if (value === null) {
    return ''
  }

  return typeof value === 'number' ? String(value) : escapeField(defuse(value))
}

export function toCsvRow(values: readonly CsvValue[]): string {
  return values.map(toCell).join(',')
}

export function reportToCsvValues(report: ReportExportRow): CsvValue[] {
  return [
    report.eventNumber,
    report.createdAt.toISOString(),
    report.resolvedAt ? 'resolved' : 'open',
    report.resolvedAt ? report.resolvedAt.toISOString() : null,
    report.category,
    REPORT_CATEGORY_LABELS[report.category] ?? report.category,
    report.description,
    report.typology,
    report.quantity,
    report.unit,
    report.species,
    report.habitat,
    report.statut,
    report.latitude,
    report.longitude,
    report.photoUrl,
    report.reporter,
  ]
}

export function reportsToCsv(
  reports: readonly ReportExportRow[],
  columns: readonly CsvColumn[] = CSV_HEADERS,
): string {
  const rows = [
    toCsvRow(columns.map((column) => CSV_HEADER_LABELS[column])),
    ...reports.map((report) => {
      const values = reportToCsvValues(report)

      return toCsvRow(
        columns.map((column) => values[CSV_HEADERS.indexOf(column)]),
      )
    }),
  ]

  return CSV_BOM + rows.join(ROW_SEPARATOR) + ROW_SEPARATOR
}

export function csvFileName(now: Date): string {
  return `signalements-${now.toISOString().slice(0, 10)}.csv`
}
