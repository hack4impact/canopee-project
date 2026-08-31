import { describe, expect, it } from 'vitest'
import {
  dateParts,
  escapeCsvValue,
  exportFileName,
  MINISTRY_COLUMNS,
  observerName,
  parseDelimiterParam,
  observerStatusLabel,
  photoFileName,
  provincialStatusLabel,
  toCsv,
  toMinistryRow,
  type ObservationExportRow,
} from './export'

function buildRow(
  overrides: Partial<ObservationExportRow> = {},
): ObservationExportRow {
  return {
    eventNumber: 42,
    category: 'amphibien',
    species: 'salamandre à quatre orteils',
    latitude: '45.590000',
    longitude: '-73.720000',
    description: 'Sous une souche humide',
    habitat: 'Érablière',
    quantity: 3,
    unit: 'individus',
    statut: 'susceptible',
    photoUrl: 'a1b2/1755000000000-uuid.jpg',
    createdAt: new Date('2026-07-14T18:35:00.000Z'),
    observerFirstName: 'Valérie',
    observerLastName: 'Lahaie',
    observerRole: 'pro',
    reporterEmail: null,
    ...overrides,
  }
}

describe('MINISTRY_COLUMNS', () => {
  it('keeps the 20 columns of the ministry sheet in order', () => {
    expect(MINISTRY_COLUMNS).toHaveLength(20)
    expect(MINISTRY_COLUMNS[0]).toBe('Catégorie')
    expect(MINISTRY_COLUMNS[19]).toBe('Numéro de signalement unique')
  })
})

describe('dateParts', () => {
  it('splits the timestamp in Quebec local time', () => {
    expect(dateParts(new Date('2026-07-14T18:35:00.000Z'))).toEqual({
      year: '2026',
      month: '07',
      day: '14',
      time: '14:35',
    })
  })

  it('rolls back to the previous day when UTC is already past midnight', () => {
    expect(dateParts(new Date('2026-01-01T02:15:00.000Z'))).toEqual({
      year: '2025',
      month: '12',
      day: '31',
      time: '21:15',
    })
  })
})

describe('observerName', () => {
  it('uses the "Nom, Prénom" order the ministry asks for', () => {
    expect(observerName(buildRow())).toBe('Lahaie, Valérie')
  })

  it('falls back to the citizen email when there is no account', () => {
    expect(
      observerName(
        buildRow({
          observerFirstName: null,
          observerLastName: null,
          observerRole: null,
          reporterEmail: 'marie.dubois@example.com',
        }),
      ),
    ).toBe('marie.dubois@example.com')
  })

  it('keeps the single name it has when the other half is missing', () => {
    expect(observerName(buildRow({ observerFirstName: null }))).toBe('Lahaie')
  })

  it('stays empty when nothing identifies the observer', () => {
    expect(
      observerName(
        buildRow({
          observerFirstName: null,
          observerLastName: null,
          reporterEmail: null,
        }),
      ),
    ).toBe('')
  })
})

describe('observerStatusLabel', () => {
  it('labels each role', () => {
    expect(observerStatusLabel('pro')).toBe('Patrouilleur pro')
    expect(observerStatusLabel('volunteer')).toBe('Patrouilleur bénévole')
    expect(observerStatusLabel('admin')).toBe('Admin')
  })

  it('treats a reporter without an account as a citizen', () => {
    expect(observerStatusLabel(null)).toBe('Citoyen')
  })
})

describe('provincialStatusLabel', () => {
  it('translates the stored value', () => {
    expect(provincialStatusLabel('susceptible')).toBe('Susceptible')
    expect(provincialStatusLabel('exotique_envahissante')).toBe(
      'Espèce exotique envahissante',
    )
  })

  it('passes an unknown value through rather than dropping it', () => {
    expect(provincialStatusLabel('inconnu')).toBe('inconnu')
  })

  it('stays empty when there is no status', () => {
    expect(provincialStatusLabel(null)).toBe('')
  })
})

describe('photoFileName', () => {
  it('keeps only the file name of the storage path', () => {
    expect(photoFileName('a1b2/1755000000000-uuid.jpg')).toBe(
      '1755000000000-uuid.jpg',
    )
  })

  it('stays empty without a photo', () => {
    expect(photoFileName(null)).toBe('')
  })
})

describe('toMinistryRow', () => {
  it('maps a report onto the ministry columns', () => {
    expect(toMinistryRow(buildRow())).toEqual([
      'Amphibiens',
      '',
      'salamandre à quatre orteils',
      '45.590000',
      '-73.720000',
      'Bois Papineau',
      '2026',
      '07',
      '14',
      'Lahaie, Valérie',
      'Sous une souche humide',
      'Érablière',
      '3',
      'individus',
      '1755000000000-uuid.jpg',
      'Susceptible',
      'Patrouilleur pro',
      'Bois Papineau',
      '14:35',
      '42',
    ])
  })

  it('produces one cell per column', () => {
    expect(toMinistryRow(buildRow())).toHaveLength(MINISTRY_COLUMNS.length)
  })

  it('leaves the wooded area empty outside the known areas', () => {
    const row = toMinistryRow(
      buildRow({ latitude: '46.800000', longitude: '-71.200000' }),
    )

    expect(row[5]).toBe('')
    expect(row[17]).toBe('')
  })

  it('empties the optional fields rather than writing null', () => {
    const row = toMinistryRow(
      buildRow({
        species: null,
        description: null,
        habitat: null,
        quantity: null,
        unit: null,
        statut: null,
        photoUrl: null,
      }),
    )

    expect([
      row[2],
      row[10],
      row[11],
      row[12],
      row[13],
      row[14],
      row[15],
    ]).toEqual(['', '', '', '', '', '', ''])
  })

  it('keeps a zero count instead of blanking it', () => {
    expect(toMinistryRow(buildRow({ quantity: 0 }))[12]).toBe('0')
  })
})

describe('escapeCsvValue', () => {
  it('leaves a plain value alone', () => {
    expect(escapeCsvValue('Amphibiens')).toBe('Amphibiens')
  })

  it('quotes a value holding the delimiter', () => {
    expect(escapeCsvValue('Lahaie, Valérie')).toBe('"Lahaie, Valérie"')
  })

  it('leaves a comma alone when the caller asked for semicolons', () => {
    expect(escapeCsvValue('Lahaie, Valérie', ';')).toBe('Lahaie, Valérie')
  })

  it('doubles the inner quotes', () => {
    expect(escapeCsvValue('Sous un "abri"')).toBe('"Sous un ""abri"""')
  })

  it('quotes a value spanning several lines', () => {
    expect(escapeCsvValue('Première ligne\nSeconde')).toBe(
      '"Première ligne\nSeconde"',
    )
  })
})

describe('toCsv', () => {
  it('starts with a BOM so Excel reads the accents', () => {
    expect(toCsv([]).startsWith('﻿')).toBe(true)
  })

  it('writes the header even without observations', () => {
    expect(toCsv([])).toBe(`﻿${MINISTRY_COLUMNS.join(',')}\r\n`)
  })

  it('switches every separator when asked for semicolons', () => {
    expect(toCsv([], ';')).toBe(`﻿${MINISTRY_COLUMNS.join(';')}\r\n`)
  })

  it('writes one CRLF-terminated line per observation', () => {
    const csv = toCsv([buildRow(), buildRow({ eventNumber: 43 })])
    const lines = csv.replace('﻿', '').split('\r\n')

    expect(lines).toHaveLength(4)
    expect(lines[3]).toBe('')
    expect(lines[1].endsWith(',42')).toBe(true)
    expect(lines[2].endsWith(',43')).toBe(true)
  })

  it('keeps a description containing the delimiter inside one cell', () => {
    const csv = toCsv([
      buildRow({ description: 'Trois adultes, deux juvéniles' }),
    ])

    expect(csv).toContain('"Trois adultes, deux juvéniles"')
  })

  it('quotes the observer name, which always holds a comma', () => {
    expect(toCsv([buildRow()])).toContain('"Lahaie, Valérie"')
  })
})

describe('parseDelimiterParam', () => {
  it('defaults to a comma', () => {
    expect(parseDelimiterParam(null)).toBe(',')
    expect(parseDelimiterParam(undefined)).toBe(',')
    expect(parseDelimiterParam('')).toBe(',')
  })

  it('accepts a semicolon for French Excel', () => {
    expect(parseDelimiterParam('semicolon')).toBe(';')
    expect(parseDelimiterParam(';')).toBe(';')
  })

  it('falls back to a comma on anything else', () => {
    expect(parseDelimiterParam('tab')).toBe(',')
    expect(parseDelimiterParam('|')).toBe(',')
  })
})

describe('exportFileName', () => {
  it('dates the file in Quebec local time', () => {
    expect(exportFileName(new Date('2026-07-14T18:35:00.000Z'))).toBe(
      'signalements-faune-flore-20260714.csv',
    )
  })
})
