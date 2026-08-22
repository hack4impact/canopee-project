import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_RESOLVED_DELAY_HOURS,
  parseResolvedDelayHours,
  resolvedCutoff,
  resolvedDelayHours,
} from './visibility'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('parseResolvedDelayHours', () => {
  it('falls back to two days', () => {
    expect(parseResolvedDelayHours(null)).toBe(DEFAULT_RESOLVED_DELAY_HOURS)
    expect(parseResolvedDelayHours(undefined)).toBe(
      DEFAULT_RESOLVED_DELAY_HOURS,
    )
    expect(parseResolvedDelayHours('')).toBe(DEFAULT_RESOLVED_DELAY_HOURS)
    expect(parseResolvedDelayHours('deux jours')).toBe(
      DEFAULT_RESOLVED_DELAY_HOURS,
    )
  })

  it('refuses a delay that is zero or negative', () => {
    expect(parseResolvedDelayHours('0')).toBe(DEFAULT_RESOLVED_DELAY_HOURS)
    expect(parseResolvedDelayHours('-12')).toBe(DEFAULT_RESOLVED_DELAY_HOURS)
  })

  it('accepts a number of hours', () => {
    expect(parseResolvedDelayHours('12')).toBe(12)
    expect(parseResolvedDelayHours('0.5')).toBe(0.5)
  })
})

describe('resolvedDelayHours', () => {
  it('reads the delay from the environment', () => {
    vi.stubEnv('REPORTS_MAP_RESOLVED_DELAY_HOURS', '6')
    expect(resolvedDelayHours()).toBe(6)
  })

  it('uses the default when the variable is not set', () => {
    vi.stubEnv('REPORTS_MAP_RESOLVED_DELAY_HOURS', '')
    expect(resolvedDelayHours()).toBe(DEFAULT_RESOLVED_DELAY_HOURS)
  })
})

describe('resolvedCutoff', () => {
  it('goes back two days by default', () => {
    expect(resolvedCutoff(new Date('2026-08-22T10:00:00Z')).toISOString()).toBe(
      '2026-08-20T10:00:00.000Z',
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

    expect(new Date('2026-08-21T10:00:00Z') >= cutoff).toBe(true)
    expect(new Date('2026-08-19T10:00:00Z') >= cutoff).toBe(false)
  })
})
