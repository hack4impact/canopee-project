import { afterEach, describe, expect, it, vi } from 'vitest'

const { getCurrentUserProfile, onConflictDoUpdate } = vi.hoisted(() => ({
  getCurrentUserProfile: vi.fn(),
  onConflictDoUpdate: vi.fn(),
}))

vi.mock('@/lib/auth/current-user', () => ({ getCurrentUserProfile }))
vi.mock('@/db', () => ({
  db: {
    insert: () => ({
      values: () => ({ onConflictDoUpdate }),
    }),
  },
  mapLoadCounters: { month: 'month', count: 'count' },
}))

const { POST } = await import('@/app/api/map-loads/route')

afterEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/map-loads', () => {
  it('returns 401 when nobody is signed in', async () => {
    getCurrentUserProfile.mockResolvedValue(null)

    const response = await POST()

    expect(response.status).toBe(401)
    expect(onConflictDoUpdate).not.toHaveBeenCalled()
  })

  it('returns 403 when the account is not an approved volunteer', async () => {
    getCurrentUserProfile.mockResolvedValue({
      role: 'volunteer',
      status: 'pending',
    })

    const response = await POST()

    expect(response.status).toBe(403)
    expect(onConflictDoUpdate).not.toHaveBeenCalled()
  })

  it('increments the counter for an approved volunteer', async () => {
    getCurrentUserProfile.mockResolvedValue({
      role: 'volunteer',
      status: 'approved',
    })
    onConflictDoUpdate.mockResolvedValue(undefined)

    const response = await POST()

    expect(response.status).toBe(204)
    expect(onConflictDoUpdate).toHaveBeenCalled()
  })
})
