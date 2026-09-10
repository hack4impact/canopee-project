import { afterEach, describe, expect, it, vi } from 'vitest'

const { getCurrentUserProfile, listPatrolsForUser } = vi.hoisted(() => ({
  getCurrentUserProfile: vi.fn(),
  listPatrolsForUser: vi.fn(),
}))

vi.mock('@/lib/auth/current-user', () => ({ getCurrentUserProfile }))
vi.mock('@/lib/patrols/queries', () => ({
  listPatrolsForUser,
  parsePageParam: (value: string | null) => Number(value) || 1,
}))

const { GET } = await import('@/app/api/patrols/route')

function requestFor(url = 'http://localhost/api/patrols') {
  return { nextUrl: new URL(url) } as Parameters<typeof GET>[0]
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/patrols', () => {
  it('returns 401 when nobody is signed in', async () => {
    getCurrentUserProfile.mockResolvedValue(null)

    const response = await GET(requestFor())

    expect(response.status).toBe(401)
    expect(listPatrolsForUser).not.toHaveBeenCalled()
  })

  it('returns 403 when the account is not approved', async () => {
    getCurrentUserProfile.mockResolvedValue({
      role: 'volunteer',
      status: 'pending',
    })

    const response = await GET(requestFor())

    expect(response.status).toBe(403)
    expect(listPatrolsForUser).not.toHaveBeenCalled()
  })

  it('lists the caller own patrols', async () => {
    getCurrentUserProfile.mockResolvedValue({
      id: 'user-1',
      role: 'volunteer',
      status: 'approved',
    })
    listPatrolsForUser.mockResolvedValue({ items: [], hasNextPage: false })

    const response = await GET(requestFor())

    expect(response.status).toBe(200)
    expect(listPatrolsForUser).toHaveBeenCalledWith('user-1', 1)
  })
})
