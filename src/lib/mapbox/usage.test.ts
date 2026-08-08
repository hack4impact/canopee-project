import { describe, expect, it } from 'vitest'
import {
  computeMapboxUsageStatus,
  getMonthKey,
  MAPBOX_FREE_TIER_THRESHOLD,
} from './usage'

describe('getMonthKey', () => {
  it('formats as UTC YYYY-MM', () => {
    expect(getMonthKey(new Date('2026-08-08T23:00:00Z'))).toBe('2026-08')
    expect(getMonthKey(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01')
  })
})

describe('computeMapboxUsageStatus', () => {
  it('reports headroom under normal usage', () => {
    const status = computeMapboxUsageStatus(
      1_000,
      new Date('2026-08-08T00:00:00Z'),
    )

    expect(status.threshold).toBe(MAPBOX_FREE_TIER_THRESHOLD)
    expect(status.remaining).toBe(49_000)
    expect(status.isWarning).toBe(false)
  })

  it('does not warn when projected usage stays under 80%', () => {
    // Day 10 of a 31-day month, 10,000 loads so far -> projects to ~31,000 (62%).
    const status = computeMapboxUsageStatus(
      10_000,
      new Date('2026-08-10T00:00:00Z'),
    )

    expect(status.projectedMonthly).toBe(31_000)
    expect(status.isWarning).toBe(false)
  })

  it('warns when projected usage crosses 80% of the threshold', () => {
    // Day 10 of a 31-day month, 13,000 loads so far -> projects to ~40,300 (80.6%).
    const status = computeMapboxUsageStatus(
      13_000,
      new Date('2026-08-10T00:00:00Z'),
    )

    expect(status.projectedPercent).toBeGreaterThanOrEqual(0.8)
    expect(status.isWarning).toBe(true)
  })

  it('never lets remaining headroom go negative once over threshold', () => {
    const status = computeMapboxUsageStatus(
      60_000,
      new Date('2026-08-15T00:00:00Z'),
    )

    expect(status.remaining).toBe(0)
  })
})
