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
  drivePhotoUrl: string | null
  createdAt: Date
  resolvedAt: Date | null
  reporter: string | null
}

export type CsvValue = string | number | null

export const CSV_HEADERS = [
  'numero_signalement',
  'date_observation',
  'statut_signalement',
  'date_resolution',
  'categorie',
  'libelle_categorie',
  'commentaires',
  'typologie',
  'nombre_observe',
  'unite',
  'nom_commun',
  'habitat',
  'statut_provincial',
  'latitude',
  'longitude',
  'nom_fichier',
  'lien_photo',
  'observateurs',
] as const

export type CsvColumn = (typeof CSV_HEADERS)[number]

export const CSV_HEADER_LABELS: Record<CsvColumn, string> = {
  numero_signalement: 'Numéro de signalement unique',
  date_observation: "Date de l'observation",
  statut_signalement: 'Statut du signalement',
  date_resolution: 'Date de résolution',
  categorie: 'Catégorie',
  libelle_categorie: 'Libellé de la catégorie',
  commentaires: 'Commentaires',
  typologie: 'Typologie',
  nombre_observe: 'Nombre observé',
  unite: 'Unité associée au nombre',
  nom_commun: 'Nom commun',
  habitat: 'Habitat',
  statut_provincial: 'Statut provincial',
  latitude: 'Latitude',
  longitude: 'Longitude',
  nom_fichier: 'Nom du fichier',
  lien_photo: 'Lien de la photo',
  observateurs: 'Observateurs/observatrices',
}

export const CSV_COLUMN_GROUPS: {
  label: string
  columns: readonly CsvColumn[]
}[] = [
  {
    label: 'Identification',
    columns: [
      'numero_signalement',
      'categorie',
      'libelle_categorie',
      'typologie',
    ],
  },
  {
    label: 'Localisation',
    columns: ['latitude', 'longitude'],
  },
  {
    label: 'Faune et flore',
    columns: [
      'nom_commun',
      'habitat',
      'nombre_observe',
      'unite',
      'statut_provincial',
    ],
  },
  {
    label: 'Suivi',
    columns: [
      'date_observation',
      'statut_signalement',
      'date_resolution',
      'observateurs',
      'commentaires',
    ],
  },
  {
    label: 'Photo',
    columns: ['nom_fichier', 'lien_photo'],
  },
]

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
    .filter(Boolean)
  const unknown = requested.find((part) => !isCsvColumn(part))

  if (unknown !== undefined) return { ok: false, value: unknown }

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

function defuse(value: string): string {
  return FORMULA_PREFIXES.some((prefix) => value.startsWith(prefix))
    ? `'${value}`
    : value
}

export function escapeField(value: string): string {
  return NEEDS_QUOTING.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

export function toCell(value: CsvValue): string {
  if (value === null) return ''
  return typeof value === 'number' ? String(value) : escapeField(defuse(value))
}

export function toCsvRow(values: readonly CsvValue[]): string {
  return values.map(toCell).join(',')
}

export function reportToCsvValues(report: ReportExportRow): CsvValue[] {
  return [
    report.eventNumber,
    report.createdAt.toISOString(),
    report.resolvedAt ? 'Résolu' : 'En attente',
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
    report.drivePhotoUrl,
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
