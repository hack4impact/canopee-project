import { afterEach, describe, expect, it, vi } from 'vitest'

const { getCurrentUserProfile, getPatrolById, listPatrolRoute } = vi.hoisted(
  () => ({
    getCurrentUserProfile: vi.fn(),
    getPatrolById: vi.fn(),
    listPatrolRoute: vi.fn(),
  }),
)

vi.mock('@/lib/auth/current-user', () => ({ getCurrentUserProfile }))
vi.mock('@/lib/patrols/queries', () => ({ getPatrolById, listPatrolRoute }))

const { GET } = await import('@/app/api/patrols/[id]/points/route')

const PATROL_ID = '3f7c1a92-5d64-4f0b-9a21-8c5e7b04d113'

afterEach(() => {
  vi.clearAllMocks()
})

function callGet() {
  return GET(new Request('http://localhost'), {
    params: Promise.resolve({ id: PATROL_ID }),
  })
}

describe('GET /api/patrols/[id]/points', () => {
  it('returns 401 when nobody is signed in', async () => {
    getCurrentUserProfile.mockResolvedValue(null)

    const response = await callGet()

    expect(response.status).toBe(401)
    expect(getPatrolById).not.toHaveBeenCalled()
  })

  it('returns 403 when the account is not approved', async () => {
    getCurrentUserProfile.mockResolvedValue({
      role: 'volunteer',
      status: 'pending',
    })

    const response = await callGet()

    expect(response.status).toBe(403)
    expect(getPatrolById).not.toHaveBeenCalled()
  })

  it('returns 403 when the patrol belongs to someone else', async () => {
    getCurrentUserProfile.mockResolvedValue({
      id: 'user-1',
      role: 'volunteer',
      status: 'approved',
    })
    getPatrolById.mockResolvedValue({ id: PATROL_ID, userId: 'other-user' })

    const response = await callGet()

    expect(response.status).toBe(403)
    expect(listPatrolRoute).not.toHaveBeenCalled()
  })
})
