import { describe, expect, it } from 'vitest'
import {
  parseHistorySort,
  parseHistoryStatus,
  sectionReports,
  sortReportsByHistory,
  DEFAULT_HISTORY_SORT,
  DEFAULT_HISTORY_STATUS,
} from '@/lib/reports/history'

const ITEMS = [
  {
    category: 'fallen_tree' as const,
    createdAt: new Date('2026-08-12T18:20:00Z'),
  },
  {
    category: 'littering' as const,
    createdAt: new Date('2026-08-02T14:00:00Z'),
  },
  {
    category: 'unleashed_dog' as const,
    createdAt: new Date('2026-07-28T11:30:00Z'),
  },
]

describe('parseHistoryStatus', () => {
  it('falls back to the default when the param is missing or unknown', () => {
    expect(parseHistoryStatus(undefined)).toBe(DEFAULT_HISTORY_STATUS)
    expect(parseHistoryStatus('')).toBe(DEFAULT_HISTORY_STATUS)
    expect(parseHistoryStatus('pending')).toBe(DEFAULT_HISTORY_STATUS)
  })

  it('accepts the known statuses regardless of case or padding', () => {
    expect(parseHistoryStatus('open')).toBe('open')
    expect(parseHistoryStatus('  RESOLVED ')).toBe('resolved')
  })
})

describe('parseHistorySort', () => {
  it('falls back to the default when the param is missing or unknown', () => {
    expect(parseHistorySort(undefined)).toBe(DEFAULT_HISTORY_SORT)
    expect(parseHistorySort('alphabetical')).toBe(DEFAULT_HISTORY_SORT)
  })

  it('accepts the known sorts', () => {
    expect(parseHistorySort('oldest')).toBe('oldest')
    expect(parseHistorySort('wooded')).toBe('wooded')
  })
})

describe('sortReportsByHistory', () => {
  it('puts the Autre bucket last when sorting by wooded area', () => {
    const sorted = sortReportsByHistory(
      [
        {
          category: 'fallen_tree' as const,
          createdAt: new Date('2026-08-12T18:20:00Z'),
          woodedArea: 'Autre',
        },
        {
          category: 'littering' as const,
          createdAt: new Date('2026-08-02T14:00:00Z'),
          woodedArea: 'Bois Papineau',
        },
        {
          category: 'unleashed_dog' as const,
          createdAt: new Date('2026-07-28T11:30:00Z'),
          woodedArea: 'Bois de la Source',
        },
      ],
      'wooded',
    )

    expect(sorted.map((item) => item.woodedArea)).toEqual([
      'Bois de la Source',
      'Bois Papineau',
      'Autre',
    ])
  })
})

describe('sectionReports', () => {
  it('groups consecutive reports by month for the date sorts', () => {
    const sections = sectionReports(ITEMS, 'recent')

    expect(sections).toHaveLength(2)
    expect(sections[0].label).toBe('Août 2026')
    expect(sections[0].items).toHaveLength(2)
    expect(sections[1].label).toBe('Juillet 2026')
  })

  it('groups by wooded area label when sorting by wooded', () => {
    const sections = sectionReports(ITEMS, 'wooded')

    expect(sections.map((section) => section.label)).toEqual(['Autre'])
  })

  it('handles an empty list', () => {
    expect(sectionReports([], 'recent')).toEqual([])
  })
})
