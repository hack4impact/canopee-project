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

export function reportsToCsv(reports: readonly ReportExportRow[]): string {
  const rows = [
    toCsvRow([...CSV_HEADERS]),
    ...reports.map((report) => toCsvRow(reportToCsvValues(report))),
  ]

  return CSV_BOM + rows.join(ROW_SEPARATOR) + ROW_SEPARATOR
}

export function csvFileName(now: Date): string {
  return `signalements-${now.toISOString().slice(0, 10)}.csv`
}
