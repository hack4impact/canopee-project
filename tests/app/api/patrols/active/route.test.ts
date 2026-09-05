import { afterEach, describe, expect, it, vi } from 'vitest'

const { getCurrentUserProfile, getActivePatrol } = vi.hoisted(() => ({
  getCurrentUserProfile: vi.fn(),
  getActivePatrol: vi.fn(),
}))

vi.mock('@/lib/auth/current-user', () => ({ getCurrentUserProfile }))
vi.mock('@/lib/patrols/queries', () => ({ getActivePatrol }))

const { GET } = await import('@/app/api/patrols/active/route')

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/patrols/active', () => {
  it('returns 401 when nobody is signed in', async () => {
    getCurrentUserProfile.mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(401)
    expect(getActivePatrol).not.toHaveBeenCalled()
  })

  it('returns 403 when the account is not approved', async () => {
    getCurrentUserProfile.mockResolvedValue({
      role: 'volunteer',
      status: 'pending',
    })

    const response = await GET()

    expect(response.status).toBe(403)
    expect(getActivePatrol).not.toHaveBeenCalled()
  })

  it('returns the active patrol for an approved volunteer', async () => {
    getCurrentUserProfile.mockResolvedValue({
      id: 'user-1',
      role: 'volunteer',
      status: 'approved',
    })
    getActivePatrol.mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(200)
    expect(getActivePatrol).toHaveBeenCalledWith('user-1')
  })
})
