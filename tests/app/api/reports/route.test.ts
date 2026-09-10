import { afterEach, describe, expect, it, vi } from 'vitest'

const { getCurrentUserProfile, listReportPins, createReport } = vi.hoisted(
  () => ({
    getCurrentUserProfile: vi.fn(),
    listReportPins: vi.fn(),
    createReport: vi.fn(),
  }),
)

vi.mock('@/lib/auth/current-user', () => ({ getCurrentUserProfile }))
vi.mock('@/lib/reports/queries', () => ({ listReportPins }))
vi.mock('@/lib/reports/submit', () => ({ createReport }))

const { GET, POST } = await import('@/app/api/reports/route')

function requestFor(url = 'http://localhost/api/reports', init?: RequestInit) {
  return {
    nextUrl: new URL(url),
    formData: async () => new FormData(),
    ...init,
  } as unknown as Parameters<typeof GET>[0]
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/reports', () => {
  it('returns 401 when nobody is signed in', async () => {
    getCurrentUserProfile.mockResolvedValue(null)

    const response = await GET(requestFor())

    expect(response.status).toBe(401)
    expect(listReportPins).not.toHaveBeenCalled()
  })

  it('returns 403 when the account is not approved', async () => {
    getCurrentUserProfile.mockResolvedValue({
      role: 'volunteer',
      status: 'pending',
    })

    const response = await GET(requestFor())

    expect(response.status).toBe(403)
    expect(listReportPins).not.toHaveBeenCalled()
  })

  it('serves pins to an approved volunteer', async () => {
    getCurrentUserProfile.mockResolvedValue({
      role: 'volunteer',
      status: 'approved',
    })
    listReportPins.mockResolvedValue([])

    const response = await GET(requestFor())

    expect(response.status).toBe(200)
    expect(listReportPins).toHaveBeenCalled()
  })
})

describe('POST /api/reports', () => {
  it('returns 401 when the caller cannot submit as a volunteer', async () => {
    getCurrentUserProfile.mockResolvedValue(null)

    const response = await POST(requestFor())

    expect(response.status).toBe(401)
    expect(createReport).not.toHaveBeenCalled()
  })
})
