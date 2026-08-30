import { describe, expect, it } from 'vitest'
import {
  csvFileName,
  escapeField,
  reportToCsvValues,
  reportsToCsv,
  toCell,
  toCsvRow,
  CSV_BOM,
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
  createdAt: new Date('2026-03-04T15:30:00.000Z'),
  resolvedAt: null,
  reporter: 'benevole@example.org',
}

function rowsOf(csv: string): string[] {
  return csv.slice(CSV_BOM.length).trimEnd().split('\r\n')
}

describe('escapeField', () => {
  it('leaves plain values untouched', () => {
    expect(escapeField('Arbre tombé')).toBe('Arbre tombé')
  })

  it('quotes values holding a comma, a quote or a newline', () => {
    expect(escapeField('a,b')).toBe('"a,b"')
    expect(escapeField('say "hi"')).toBe('"say ""hi"""')
    expect(escapeField('line\nbreak')).toBe('"line\nbreak"')
    expect(escapeField('line\rbreak')).toBe('"line\rbreak"')
  })
})

describe('toCell', () => {
  it('renders null as an empty field', () => {
    expect(toCell(null)).toBe('')
  })

  it('neutralizes text a spreadsheet would read as a formula', () => {
    expect(toCell('=SUM(A1:A9)')).toBe("'=SUM(A1:A9)")
    expect(toCell('+1')).toBe("'+1")
    expect(toCell('@here')).toBe("'@here")
    expect(toCell('-- note')).toBe("'-- note")
  })

  it('keeps negative numbers numeric', () => {
    expect(toCell(-73.723)).toBe('-73.723')
    expect(toCell(0)).toBe('0')
  })

  it('quotes a defused value that also needs escaping', () => {
    expect(toCell('=a,b')).toBe('"\'=a,b"')
  })
})

describe('toCsvRow', () => {
  it('joins fields with commas', () => {
    expect(toCsvRow([1, 'open', null, 'a,b'])).toBe('1,open,,"a,b"')
  })
})

describe('reportToCsvValues', () => {
  it('produces one value per header', () => {
    expect(reportToCsvValues(REPORT)).toHaveLength(CSV_HEADERS.length)
  })

  it('derives the status from resolvedAt', () => {
    const values = reportToCsvValues(REPORT)
    expect(values[2]).toBe('open')
    expect(values[3]).toBeNull()

    const resolved = reportToCsvValues({
      ...REPORT,
      resolvedAt: new Date('2026-03-05T09:00:00.000Z'),
    })
    expect(resolved[2]).toBe('resolved')
    expect(resolved[3]).toBe('2026-03-05T09:00:00.000Z')
  })

  it('carries both the category key and its French label', () => {
    const values = reportToCsvValues(REPORT)
    expect(values[4]).toBe('fallen_tree')
    expect(values[5]).toBe('Arbre tombé')
  })
})

describe('reportsToCsv', () => {
  it('starts with the BOM so Excel decodes the French labels', () => {
    expect(reportsToCsv([REPORT]).startsWith(CSV_BOM)).toBe(true)
  })

  it('writes the header row first', () => {
    expect(rowsOf(reportsToCsv([REPORT]))[0]).toBe(CSV_HEADERS.join(','))
  })

  it('writes one row per report, in the given order', () => {
    const csv = reportsToCsv([REPORT, { ...REPORT, eventNumber: 13 }])
    const rows = rowsOf(csv)

    expect(rows).toHaveLength(3)
    expect(rows[1].startsWith('12,')).toBe(true)
    expect(rows[2].startsWith('13,')).toBe(true)
  })

  it('emits only the header when there is nothing to export', () => {
    expect(rowsOf(reportsToCsv([]))).toHaveLength(1)
  })

  it('terminates rows with CRLF', () => {
    expect(reportsToCsv([REPORT]).endsWith('\r\n')).toBe(true)
  })

  it('keeps an embedded newline inside a single quoted field', () => {
    const csv = reportsToCsv([{ ...REPORT, description: 'deux\nlignes' }])

    expect(csv).toContain('"deux\nlignes"')
    expect(rowsOf(csv)).toHaveLength(2)
  })
})

describe('csvFileName', () => {
  it('stamps the file with the export date', () => {
    expect(csvFileName(new Date('2026-03-04T15:30:00.000Z'))).toBe(
      'signalements-2026-03-04.csv',
    )
  })
})
