import { describe, expect, it } from 'vitest'
import {
  resolvedCutoff,
  RESOLVED_DELAY_HOURS,
} from '@/lib/observations/visibility'

describe('RESOLVED_DELAY_HOURS', () => {
  it('keeps a resolved report on the map for two weeks', () => {
    expect(RESOLVED_DELAY_HOURS).toBe(336)
  })
})

describe('resolvedCutoff', () => {
  it('goes back two weeks by default', () => {
    expect(resolvedCutoff(new Date('2026-08-22T10:00:00Z')).toISOString()).toBe(
      '2026-08-08T10:00:00.000Z',
    )
  })

  it('goes back the number of hours it is given', () => {
    expect(
      resolvedCutoff(new Date('2026-08-22T10:00:00Z'), 6).toISOString(),
    ).toBe('2026-08-22T04:00:00.000Z')
  })

  it('keeps a report that was resolved inside the delay', () => {
    const now = new Date('2026-08-22T10:00:00Z')
    const cutoff = resolvedCutoff(now)

    expect(new Date('2026-08-19T10:00:00Z') >= cutoff).toBe(true)
    expect(new Date('2026-08-01T10:00:00Z') >= cutoff).toBe(false)
  })
})
