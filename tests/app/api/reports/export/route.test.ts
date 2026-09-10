import { afterEach, describe, expect, it, vi } from 'vitest'

const { getCurrentUserProfile, listReportsForExport } = vi.hoisted(() => ({
  getCurrentUserProfile: vi.fn(),
  listReportsForExport: vi.fn(),
}))

vi.mock('@/lib/auth/current-user', () => ({ getCurrentUserProfile }))
vi.mock('@/lib/reports/queries', () => ({ listReportsForExport }))

const { GET } = await import('@/app/api/reports/export/route')

function requestFor(url = 'http://localhost/api/reports/export') {
  return { nextUrl: new URL(url) } as Parameters<typeof GET>[0]
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/reports/export', () => {
  it('returns 401 when nobody is signed in', async () => {
    getCurrentUserProfile.mockResolvedValue(null)

    const response = await GET(requestFor())

    expect(response.status).toBe(401)
    expect(listReportsForExport).not.toHaveBeenCalled()
  })

  it('returns 403 to an approved volunteer', async () => {
    getCurrentUserProfile.mockResolvedValue({
      role: 'volunteer',
      status: 'approved',
    })

    const response = await GET(requestFor())

    expect(response.status).toBe(403)
    expect(listReportsForExport).not.toHaveBeenCalled()
  })

  it('serves the CSV to an approved pro', async () => {
    getCurrentUserProfile.mockResolvedValue({
      role: 'pro',
      status: 'approved',
    })
    listReportsForExport.mockResolvedValue([])

    const response = await GET(requestFor())

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8')
    expect(listReportsForExport).toHaveBeenCalled()
  })
})
