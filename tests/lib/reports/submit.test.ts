import { describe, expect, it } from 'vitest'
import { isSameReportRetry } from '@/lib/reports/submit'

const EXISTING = {
  userId: null,
  reporterEmail: 'citoyen@example.org',
  category: 'littering',
  latitude: '45.588000',
  longitude: '-73.723000',
}

describe('isSameReportRetry', () => {
  it('treats the same citizen pin as an offline retry', () => {
    expect(isSameReportRetry(EXISTING, { ...EXISTING })).toBe(true)
  })

  it('rejects a different author reusing the id', () => {
    expect(
      isSameReportRetry(EXISTING, {
        ...EXISTING,
        reporterEmail: 'autre@example.org',
      }),
    ).toBe(false)
  })

  it('rejects the same author on a different pin', () => {
    expect(
      isSameReportRetry(EXISTING, {
        ...EXISTING,
        latitude: '45.590000',
      }),
    ).toBe(false)
  })
})
