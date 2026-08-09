import { describe, expect, it } from 'vitest'
import {
  canAccess,
  isAdmin,
  isApproved,
  isPending,
  isRejected,
  ROLE_ORDER,
  ROLES,
  type Role,
  type Status,
} from './roles'

function user(role: Role, status: Status = 'approved') {
  return { role, status }
}

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

describe('isApproved', () => {
  it('is true only for an approved account', () => {
    expect(isApproved(user('volunteer', 'approved'))).toBe(true)
    expect(isApproved(user('volunteer', 'pending'))).toBe(false)
    expect(isApproved(user('volunteer', 'rejected'))).toBe(false)
  })

  it('is false for a nullish user', () => {
    expect(isApproved(null)).toBe(false)
    expect(isApproved(undefined)).toBe(false)
  })
})

describe('isPending / isRejected', () => {
  it('each matches only its own status', () => {
    expect(isPending(user('volunteer', 'pending'))).toBe(true)
    expect(isPending(user('volunteer', 'rejected'))).toBe(false)
    expect(isPending(user('volunteer', 'approved'))).toBe(false)

    expect(isRejected(user('volunteer', 'rejected'))).toBe(true)
    expect(isRejected(user('volunteer', 'pending'))).toBe(false)
    expect(isRejected(user('volunteer', 'approved'))).toBe(false)
  })

  it('is false for a nullish user', () => {
    expect(isPending(null)).toBe(false)
    expect(isRejected(null)).toBe(false)
  })
})

describe('canAccess', () => {
  it('grants access when the user exactly meets the required role', () => {
    expect(canAccess(user('volunteer'), 'volunteer')).toBe(true)
    expect(canAccess(user('pro'), 'pro')).toBe(true)
    expect(canAccess(user('admin'), 'admin')).toBe(true)
  })

  it('grants access when the user outranks the required role', () => {
    expect(canAccess(user('pro'), 'volunteer')).toBe(true)
    expect(canAccess(user('admin'), 'volunteer')).toBe(true)
    expect(canAccess(user('admin'), 'pro')).toBe(true)
  })

  it('denies access when the user is below the required role', () => {
    expect(canAccess(user('volunteer'), 'pro')).toBe(false)
    expect(canAccess(user('volunteer'), 'admin')).toBe(false)
    expect(canAccess(user('pro'), 'admin')).toBe(false)
  })

  it('denies a nullish user (unauthenticated / citizen)', () => {
    expect(canAccess(null, 'volunteer')).toBe(false)
    expect(canAccess(undefined, 'volunteer')).toBe(false)
  })

  it('denies an unrecognized role (defensive against enum drift)', () => {
    expect(
      canAccess({ role: 'citizen' as Role, status: 'approved' }, 'volunteer'),
    ).toBe(false)
    expect(
      canAccess({ role: 'superadmin' as Role, status: 'approved' }, 'admin'),
    ).toBe(false)
  })

  it('denies a pending account even at its own role level', () => {
    expect(canAccess(user('volunteer', 'pending'), 'volunteer')).toBe(false)
    expect(canAccess(user('pro', 'pending'), 'pro')).toBe(false)
    expect(canAccess(user('admin', 'pending'), 'admin')).toBe(false)
  })

  it('denies a rejected account even at its own role level', () => {
    expect(canAccess(user('volunteer', 'rejected'), 'volunteer')).toBe(false)
    expect(canAccess(user('pro', 'rejected'), 'pro')).toBe(false)
  })

  it('denies an unrecognized status (defensive against enum drift)', () => {
    expect(canAccess(user('admin', 'blocked' as Status), 'volunteer')).toBe(
      false,
    )
  })

  it('grants an approved account at every level of the hierarchy', () => {
    for (const role of ROLES) {
      expect(canAccess(user(role, 'approved'), 'volunteer')).toBe(true)
    }
  })
})

describe('isAdmin', () => {
  it('is true only for approved admins', () => {
    expect(isAdmin(user('admin'))).toBe(true)
    expect(isAdmin(user('pro'))).toBe(false)
    expect(isAdmin(user('volunteer'))).toBe(false)
  })

  it('is false for an admin that is not approved', () => {
    expect(isAdmin(user('admin', 'pending'))).toBe(false)
    expect(isAdmin(user('admin', 'rejected'))).toBe(false)
  })

  it('is false for a nullish user', () => {
    expect(isAdmin(null)).toBe(false)
    expect(isAdmin(undefined)).toBe(false)
  })
})
