import { describe, expect, it } from 'vitest'
import {
  citizenWindowStart,
  isRateLimited,
  MAX_CITIZEN_REPORTS_PER_WINDOW,
  MAX_REPORTER_EMAIL_LENGTH,
  normalizeReporterEmail,
  validateReporterEmail,
} from '@/lib/reports/citizen'

describe('validateReporterEmail', () => {
  it('accepts a well-formed address', () => {
    expect(validateReporterEmail('citoyen@example.org')).toBeNull()
  })

  it('accepts an address padded with whitespace', () => {
    expect(validateReporterEmail('  citoyen@example.org  ')).toBeNull()
  })

  it('rejects an empty address', () => {
    expect(validateReporterEmail('')).toBeDefined()
    expect(validateReporterEmail('   ')).toBeDefined()
  })

  it('rejects an address without an @ or a domain', () => {
    expect(validateReporterEmail('citoyen')).toBeDefined()
    expect(validateReporterEmail('citoyen@')).toBeDefined()
    expect(validateReporterEmail('citoyen@example')).toBeDefined()
  })

  it('rejects an address longer than the column allows', () => {
    const local = 'a'.repeat(MAX_REPORTER_EMAIL_LENGTH)

    expect(validateReporterEmail(`${local}@example.org`)).toBeDefined()
  })
})

describe('normalizeReporterEmail', () => {
  it('trims and lowercases so the rate limit cannot be dodged by casing', () => {
    expect(normalizeReporterEmail('  Citoyen@Example.ORG ')).toBe(
      'citoyen@example.org',
    )
  })
})

describe('citizenWindowStart', () => {
  it('starts the window one hour before the given moment', () => {
    const now = new Date('2026-09-01T12:00:00Z')

    expect(citizenWindowStart(now).toISOString()).toBe(
      '2026-09-01T11:00:00.000Z',
    )
  })
})

describe('isRateLimited', () => {
  it('allows a sender below the limit', () => {
    expect(isRateLimited(0)).toBe(false)
    expect(isRateLimited(MAX_CITIZEN_REPORTS_PER_WINDOW - 1)).toBe(false)
  })

  it('blocks a sender at or above the limit', () => {
    expect(isRateLimited(MAX_CITIZEN_REPORTS_PER_WINDOW)).toBe(true)
    expect(isRateLimited(MAX_CITIZEN_REPORTS_PER_WINDOW + 1)).toBe(true)
  })
})
