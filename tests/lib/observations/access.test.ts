import { describe, expect, it } from 'vitest'
import { canViewObservations } from '@/lib/observations/access'

describe('canViewObservations', () => {
  it('keeps fauna and flora away from volunteers', () => {
    expect(canViewObservations({ role: 'volunteer', status: 'approved' })).toBe(
      false,
    )
  })

  it('lets approved pros see them', () => {
    expect(canViewObservations({ role: 'pro', status: 'approved' })).toBe(true)
  })

  it('lets admins see them', () => {
    expect(canViewObservations({ role: 'admin', status: 'approved' })).toBe(
      true,
    )
  })

  it('waits for the account to be approved', () => {
    expect(canViewObservations({ role: 'pro', status: 'pending' })).toBe(false)
    expect(canViewObservations({ role: 'admin', status: 'rejected' })).toBe(
      false,
    )
  })

  it('turns away visitors who are not signed in', () => {
    expect(canViewObservations(null)).toBe(false)
  })
})
