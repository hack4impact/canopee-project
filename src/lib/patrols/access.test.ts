import { describe, expect, it } from 'vitest'
import type { Role, Status } from '@/lib/auth/roles'
import { canViewPatrol } from './access'

const OWNER_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_ID = '22222222-2222-4222-8222-222222222222'

const PATROL = { userId: OWNER_ID }

function viewer(
  id: string,
  role: Role = 'volunteer',
  status: Status = 'approved',
) {
  return { id, role, status }
}

describe('canViewPatrol', () => {
  it('lets a patroller see their own patrol', () => {
    expect(canViewPatrol(viewer(OWNER_ID), PATROL)).toBe(true)
  })

  it('hides a patrol from another volunteer', () => {
    expect(canViewPatrol(viewer(OTHER_ID), PATROL)).toBe(false)
  })

  it('lets an admin see a patrol they did not run', () => {
    expect(canViewPatrol(viewer(OTHER_ID, 'admin'), PATROL)).toBe(true)
  })

  it('refuses an admin whose account is not approved', () => {
    expect(canViewPatrol(viewer(OTHER_ID, 'admin', 'pending'), PATROL)).toBe(
      false,
    )
  })
})
