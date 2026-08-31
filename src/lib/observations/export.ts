import type { Role } from '@/lib/auth/roles'
import {
  FAUNE_FLORE_STATUTS,
  REPORT_CATEGORY_LABELS,
} from '@/lib/reports/categories'
import type { ObservationCategory } from '@/lib/observations/collection'
import { findWoodedArea } from '@/lib/patrols/woods'
import { speciesMetadata } from '@/lib/observations/species'

export const MINISTRY_TIME_ZONE = 'America/Toronto'

export const CSV_DELIMITER = ','

export const CSV_SEMICOLON_DELIMITER = ';'

const CSV_NEWLINE = '\r\n'

const UTF8_BOM = '﻿'

export const MINISTRY_COLUMNS = [
  'Catégorie',
  'Nom scientifique',
  'Nom commun',
  'Latitude',
  'Longitude',
  'Localisation',
  'Année de l’observation',
  'Mois de l’observation',
  'Jour de l’observation',
  'Observateurs/observatrices',
  'Commentaires',
  'Habitat',
  'Nombre observé',
  'Unité associée au nombre',
  'Nom du fichier',
  'Statut provincial',
  'Statut observateur',
  'Bois',
  'heure',
  'Numéro de signalement unique',
] as const

export type ObservationExportRow = {
  eventNumber: number
  category: ObservationCategory
  species: string | null
  latitude: string
  longitude: string
  description: string | null
  habitat: string | null
  quantity: number | null
  unit: string | null
  statut: string | null
  photoUrl: string | null
  createdAt: Date
  observerFirstName: string | null
  observerLastName: string | null
  observerRole: Role | null
  reporterEmail: string | null
}

const OBSERVER_STATUS_LABELS: Record<Role, string> = {
  volunteer: 'Patrouilleur bénévole',
  pro: 'Patrouilleur pro',
  admin: 'Admin',
}

const CITIZEN_OBSERVER_STATUS = 'Citoyen'

const STATUT_LABELS = new Map<string, string>(
  FAUNE_FLORE_STATUTS.map((statut) => [statut.value, statut.label]),
)

export function provincialStatusLabel(
  statut: string | null,
  species: string | null = null,
): string {
  const metadata = speciesMetadata(species)
  if (metadata) return metadata.provincialStatus
  if (!statut) return ''
  return STATUT_LABELS.get(statut) ?? statut
}

export function observerStatusLabel(role: Role | null): string {
  return role ? OBSERVER_STATUS_LABELS[role] : CITIZEN_OBSERVER_STATUS
}

export function observerName(row: ObservationExportRow): string {
  const parts = [row.observerLastName, row.observerFirstName]
    .map((part) => part?.trim())
    .filter((part): part is string => !!part)

  if (parts.length > 0) {
    return parts.join(', ')
  }

  return row.reporterEmail?.trim() ?? ''
}

export function photoFileName(photoUrl: string | null): string {
  if (!photoUrl) return ''
  const segments = photoUrl.split('/')
  return segments[segments.length - 1] ?? ''
}

type DateParts = {
  year: string
  month: string
  day: string
  time: string
}

export function dateParts(
  date: Date,
  timeZone: string = MINISTRY_TIME_ZONE,
): DateParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

  const parts = new Map(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  )

  return {
    year: parts.get('year') ?? '',
    month: parts.get('month') ?? '',
    day: parts.get('day') ?? '',
    time: `${parts.get('hour') ?? ''}:${parts.get('minute') ?? ''}`,
  }
}

export function woodedAreaName(latitude: string, longitude: string): string {
  return (
    findWoodedArea([
      { latitude: Number(latitude), longitude: Number(longitude) },
    ]) ?? ''
  )
}

export function toMinistryRow(row: ObservationExportRow): string[] {
  const { year, month, day, time } = dateParts(row.createdAt)
  const bois = woodedAreaName(row.latitude, row.longitude)
  const metadata = speciesMetadata(row.species)
 
  return [
    REPORT_CATEGORY_LABELS[row.category],
    metadata?.scientificName ?? row.species ?? '',
    metadata?.commonName ?? '',
    row.latitude,
    row.longitude,
    bois,
    year,
    month,
    day,
    observerName(row),
    row.description ?? '',
    row.habitat ?? '',
    row.quantity === null ? '' : String(row.quantity),
    row.unit ?? '',
    photoFileName(row.photoUrl),
    provincialStatusLabel(row.statut, row.species),
    observerStatusLabel(row.observerRole),
    bois,
    time,
    String(row.eventNumber),
  ]
}

export function escapeCsvValue(
  value: string,
  delimiter: string = CSV_DELIMITER,
): string {
  if (
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return `"${value.replaceAll('"', '""')}"`
  }

  return value
}

export function parseDelimiterParam(value: string | null | undefined): string {
  if (value === 'semicolon' || value === ';') {
    return CSV_SEMICOLON_DELIMITER
  }

  return CSV_DELIMITER
}

export function toCsv(
  rows: readonly ObservationExportRow[],
  delimiter: string = CSV_DELIMITER,
): string {
  const lines = [
    [...MINISTRY_COLUMNS],
    ...rows.map((row) => toMinistryRow(row)),
  ].map((cells) =>
    cells.map((cell) => escapeCsvValue(cell, delimiter)).join(delimiter),
  )

  return UTF8_BOM + lines.join(CSV_NEWLINE) + CSV_NEWLINE
}

export function exportFileName(
  now: Date,
  timeZone: string = MINISTRY_TIME_ZONE,
): string {
  const { year, month, day } = dateParts(now, timeZone)
  return `signalements-faune-flore-${year}${month}${day}.csv`
}
