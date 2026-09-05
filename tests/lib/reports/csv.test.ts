import { describe, expect, it } from 'vitest'
import {
  csvFileName,
  escapeField,
  parseColumnsParam,
  reportToCsvValues,
  reportsToCsv,
  toCell,
  toCsvRow,
  CSV_BOM,
  CSV_HEADER_LABELS,
  CSV_HEADERS,
  type ReportExportRow,
} from '@/lib/reports/csv'

const REPORT: ReportExportRow = {
  eventNumber: 12,
  category: 'fallen_tree',
  description: 'Arbre en travers du sentier',
  typology: null,
  quantity: null,
  species: null,
  unit: null,
  habitat: null,
  statut: null,
  latitude: 45.588,
  longitude: -73.723,
  photoUrl: null,
  drivePhotoUrl: null,
  createdAt: new Date('2026-03-04T15:30:00.000Z'),
  resolvedAt: null,
  reporter: 'benevole@example.org',
}
function rowsOf(csv: string): string[] {
  return csv.slice(CSV_BOM.length).trimEnd().split('\r\n')
}

describe('CSV helpers', () => {
  it('escapes fields and defuses formulas', () => {
    expect(escapeField('a,b')).toBe('"a,b"')
    expect(escapeField('say "hi"')).toBe('"say ""hi"""')
    expect(toCell('=SUM(A1:A9)')).toBe("'=SUM(A1:A9)")
    expect(toCell(-73.723)).toBe('-73.723')
    expect(toCsvRow([1, 'open', null, 'a,b'])).toBe('1,open,,"a,b"')
  })

  it('produces one value per header', () => {
    expect(reportToCsvValues(REPORT)).toHaveLength(CSV_HEADERS.length)
  })

  it('derives status and resolved date', () => {
    expect(reportToCsvValues(REPORT)[2]).toBe('En attente')
    expect(
      reportToCsvValues({
        ...REPORT,
        resolvedAt: new Date('2026-03-05T09:00:00.000Z'),
      })[2],
    ).toBe('Résolu')
  })

  it('parses and validates selected columns', () => {
    expect(
      parseColumnsParam('  NUMERO_SIGNALEMENT , statut_signalement ,latitude '),
    ).toEqual({
      ok: true,
      columns: ['numero_signalement', 'statut_signalement', 'latitude'],
    })
    expect(
      parseColumnsParam(
        'statut_signalement,numero_signalement,statut_signalement',
      ),
    ).toEqual({
      ok: true,
      columns: ['numero_signalement', 'statut_signalement'],
    })
    expect(parseColumnsParam('numero_signalement,gps')).toEqual({
      ok: false,
      value: 'gps',
    })
  })

  it('exports French headers and requested columns', () => {
    const csv = reportsToCsv(
      [REPORT],
      ['numero_signalement', 'statut_signalement', 'latitude'],
    )
    expect(rowsOf(csv)).toEqual([
      'Numéro de signalement unique,Statut du signalement,Latitude',
      '12,En attente,45.588',
    ])
    expect(CSV_HEADER_LABELS.categorie).toBe('Catégorie')
  })

  it('exports all columns by default and keeps the filename date', () => {
    expect(rowsOf(reportsToCsv([REPORT]))).toHaveLength(2)
    expect(csvFileName(new Date('2026-03-04T15:30:00.000Z'))).toBe(
      'signalements-2026-03-04.csv',
    )
  })
})
