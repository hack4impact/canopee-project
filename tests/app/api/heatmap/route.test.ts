import { afterEach, describe, expect, it, vi } from 'vitest'

const { getCurrentUserProfile, listHeatmapZones } = vi.hoisted(() => ({
  getCurrentUserProfile: vi.fn(),
  listHeatmapZones: vi.fn(),
}))

vi.mock('@/lib/auth/current-user', () => ({ getCurrentUserProfile }))
vi.mock('@/lib/heatmap/queries', () => ({ listHeatmapZones }))

const { GET } = await import('@/app/api/heatmap/route')

function requestFor(url = 'http://localhost/api/heatmap') {
  return { nextUrl: new URL(url) } as Parameters<typeof GET>[0]
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/heatmap', () => {
  it('returns 401 when nobody is signed in', async () => {
    getCurrentUserProfile.mockResolvedValue(null)

    const response = await GET(requestFor())

    expect(response.status).toBe(401)
    expect(listHeatmapZones).not.toHaveBeenCalled()
  })

  it('returns 403 to a volunteer who is still pending', async () => {
    getCurrentUserProfile.mockResolvedValue({
      role: 'volunteer',
      status: 'pending',
    })

    const response = await GET(requestFor())

    expect(response.status).toBe(403)
    expect(listHeatmapZones).not.toHaveBeenCalled()
  })

  it('serves the layer to an approved volunteer', async () => {
    getCurrentUserProfile.mockResolvedValue({
      role: 'volunteer',
      status: 'approved',
    })
    listHeatmapZones.mockResolvedValue([])

    const response = await GET(requestFor())

    expect(response.status).toBe(200)
    expect(listHeatmapZones).toHaveBeenCalled()
  })
})
