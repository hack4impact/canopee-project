import { describe, expect, it } from 'vitest'
import { formatPatrolMonth, sectionPatrolsByMonth } from '@/lib/patrols/history'

const PATROLS = [
  { startedAt: new Date('2026-08-29T12:40:00Z'), distanceMetres: 4800 },
  { startedAt: new Date('2026-08-26T21:05:00Z'), distanceMetres: 3100 },
  { startedAt: new Date('2026-07-31T11:50:00Z'), distanceMetres: 5600 },
]

describe('formatPatrolMonth', () => {
  it('capitalises the French month', () => {
    expect(formatPatrolMonth(PATROLS[0].startedAt)).toBe('Août 2026')
  })
})

describe('sectionPatrolsByMonth', () => {
  it('groups consecutive patrols and sums their distance', () => {
    const months = sectionPatrolsByMonth(PATROLS)

    expect(months).toHaveLength(2)
    expect(months[0].label).toBe('Août 2026')
    expect(months[0].items).toHaveLength(2)
    expect(months[0].distanceMetres).toBe(7900)
    expect(months[1].label).toBe('Juillet 2026')
    expect(months[1].distanceMetres).toBe(5600)
  })

  it('handles an empty list', () => {
    expect(sectionPatrolsByMonth([])).toEqual([])
  })
})
