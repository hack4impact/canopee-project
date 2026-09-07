import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Role, Status } from '@/lib/auth/roles'

class RedirectError extends Error {
  constructor(readonly to: string) {
    super(`redirect:${to}`)
  }
}

class ForbiddenError extends Error {
  constructor() {
    super('forbidden')
  }
}

vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new RedirectError(to)
  },
  forbidden: () => {
    throw new ForbiddenError()
  },
}))

const getUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser } }),
}))

const limit = vi.fn()
vi.mock('@/db', () => ({
  users: { authUserId: 'auth_user_id' },
  db: {
    select: () => ({
      from: () => ({ where: () => ({ limit }) }),
    }),
  },
}))

const { getCurrentUserProfile, requireApprovedAccess, requireApprovedUser } =
  await import('@/lib/auth/current-user')

function signedInAs(role: Role, status: Status) {
  getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
  limit.mockResolvedValue([
    { id: 'u1', authUserId: 'auth-1', email: 'v@example.com', role, status },
  ])
}

function signedInWithoutProfile() {
  getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
  limit.mockResolvedValue([])
}

function signedOut() {
  getUser.mockResolvedValue({ data: { user: null } })
  limit.mockResolvedValue([])
}

function databaseUnavailable() {
  getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
  limit.mockRejectedValue(new Error('connection timeout'))
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getCurrentUserProfile', () => {
  it('returns null when there is no session', async () => {
    signedOut()
    await expect(getCurrentUserProfile()).resolves.toBeNull()
  })

  it('returns null when the session has no matching users row', async () => {
    signedInWithoutProfile()
    await expect(getCurrentUserProfile()).resolves.toBeNull()
  })

  it('returns the profile for a signed-in user', async () => {
    signedInAs('volunteer', 'approved')
    await expect(getCurrentUserProfile()).resolves.toMatchObject({
      role: 'volunteer',
      status: 'approved',
    })
  })

  it('lets a lookup failure through instead of reporting no session', async () => {
    databaseUnavailable()
    await expect(getCurrentUserProfile()).rejects.toThrow('connection timeout')
  })
})

describe('requireApprovedUser (page gate)', () => {
  it('sends a signed-out visitor to the login form', async () => {
    signedOut()
    await expect(requireApprovedUser()).rejects.toThrow(
      new RedirectError('/login'),
    )
  })

  it('sends a pending volunteer to the approval-pending screen', async () => {
    signedInAs('volunteer', 'pending')
    await expect(requireApprovedUser()).rejects.toThrow(
      new RedirectError('/pending'),
    )
  })

  it('sends a rejected volunteer to the same screen', async () => {
    signedInAs('volunteer', 'rejected')
    await expect(requireApprovedUser()).rejects.toThrow(
      new RedirectError('/pending'),
    )
  })

  it('holds a pending admin back too — status outranks role', async () => {
    signedInAs('admin', 'pending')
    await expect(requireApprovedUser()).rejects.toThrow(
      new RedirectError('/pending'),
    )
  })

  it('lets an approved volunteer through', async () => {
    signedInAs('volunteer', 'approved')
    await expect(requireApprovedUser()).resolves.toMatchObject({
      role: 'volunteer',
      status: 'approved',
    })
  })

  it('lets an approved pro and admin through a volunteer gate', async () => {
    signedInAs('pro', 'approved')
    await expect(requireApprovedUser('volunteer')).resolves.toBeTruthy()

    signedInAs('admin', 'approved')
    await expect(requireApprovedUser('volunteer')).resolves.toBeTruthy()
  })

  it('403s an approved user whose role is too low, rather than redirecting', async () => {
    signedInAs('volunteer', 'approved')
    await expect(requireApprovedUser('admin')).rejects.toThrow(ForbiddenError)
  })
})

describe('requireApprovedAccess (endpoint gate)', () => {
  it('403s a pending volunteer', async () => {
    signedInAs('volunteer', 'pending')
    await expect(requireApprovedAccess()).rejects.toThrow(ForbiddenError)
  })

  it('403s a rejected volunteer', async () => {
    signedInAs('volunteer', 'rejected')
    await expect(requireApprovedAccess()).rejects.toThrow(ForbiddenError)
  })

  it('403s a signed-out caller', async () => {
    signedOut()
    await expect(requireApprovedAccess()).rejects.toThrow(ForbiddenError)
  })

  it('403s a signed-in caller with no users row', async () => {
    signedInWithoutProfile()
    await expect(requireApprovedAccess()).rejects.toThrow(ForbiddenError)
  })

  it('403s an approved volunteer on a pro-only endpoint', async () => {
    signedInAs('volunteer', 'approved')
    await expect(requireApprovedAccess('pro')).rejects.toThrow(ForbiddenError)
  })

  it('never redirects — an endpoint answers with a status, not HTML', async () => {
    signedInAs('volunteer', 'pending')
    await expect(requireApprovedAccess()).rejects.not.toThrow(RedirectError)
  })

  it('lets an approved volunteer through', async () => {
    signedInAs('volunteer', 'approved')
    await expect(requireApprovedAccess()).resolves.toMatchObject({
      status: 'approved',
    })
  })

  it('surfaces a lookup failure rather than 403ing a legitimate caller', async () => {
    databaseUnavailable()
    await expect(requireApprovedAccess()).rejects.not.toThrow(ForbiddenError)
  })
})
