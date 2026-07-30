import { describe, expect, it } from 'vitest'
import { canAccess, isAdmin, ROLE_ORDER, ROLES, type Role } from './roles'

describe('ROLE_ORDER', () => {
  it('ranks volunteer < pro < admin', () => {
    expect(ROLE_ORDER.volunteer).toBeLessThan(ROLE_ORDER.pro)
    expect(ROLE_ORDER.pro).toBeLessThan(ROLE_ORDER.admin)
  })

  it('ranks every role in the enum', () => {
    for (const role of ROLES) {
      expect(ROLE_ORDER[role]).toBeGreaterThan(0)
    }
  })
})

describe('canAccess', () => {
  it('grants access when the user exactly meets the required role', () => {
    expect(canAccess({ role: 'volunteer' }, 'volunteer')).toBe(true)
    expect(canAccess({ role: 'pro' }, 'pro')).toBe(true)
    expect(canAccess({ role: 'admin' }, 'admin')).toBe(true)
  })

  it('grants access when the user outranks the required role', () => {
    expect(canAccess({ role: 'pro' }, 'volunteer')).toBe(true)
    expect(canAccess({ role: 'admin' }, 'volunteer')).toBe(true)
    expect(canAccess({ role: 'admin' }, 'pro')).toBe(true)
  })

  it('denies access when the user is below the required role', () => {
    expect(canAccess({ role: 'volunteer' }, 'pro')).toBe(false)
    expect(canAccess({ role: 'volunteer' }, 'admin')).toBe(false)
    expect(canAccess({ role: 'pro' }, 'admin')).toBe(false)
  })

  it('denies a nullish user (unauthenticated / citizen)', () => {
    expect(canAccess(null, 'volunteer')).toBe(false)
    expect(canAccess(undefined, 'volunteer')).toBe(false)
  })

  it('denies an unrecognized role (defensive against enum drift)', () => {
    expect(canAccess({ role: 'citizen' as Role }, 'volunteer')).toBe(false)
    expect(canAccess({ role: 'superadmin' as Role }, 'admin')).toBe(false)
  })
})

describe('isAdmin', () => {
  it('is true only for admins', () => {
    expect(isAdmin({ role: 'admin' })).toBe(true)
    expect(isAdmin({ role: 'pro' })).toBe(false)
    expect(isAdmin({ role: 'volunteer' })).toBe(false)
  })

  it('is false for a nullish user', () => {
    expect(isAdmin(null)).toBe(false)
    expect(isAdmin(undefined)).toBe(false)
  })
})
