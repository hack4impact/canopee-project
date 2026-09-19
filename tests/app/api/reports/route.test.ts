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

  it('lets an admin pick the creation dates', async () => {
    getCurrentUserProfile.mockResolvedValue({
      role: 'admin',
      status: 'approved',
    })
    listReportPins.mockResolvedValue([])

    await GET(
      requestFor(
        'http://localhost/api/reports?startDate=2025-01-01&endDate=2025-03-31',
      ),
    )

    const [, , range] = listReportPins.mock.calls[0]
    expect(range.start.toISOString()).toBe('2025-01-01T00:00:00.000Z')
    expect(range.end.toISOString()).toBe('2025-03-31T23:59:59.999Z')
  })

  it('keeps a volunteer on the last two months whatever dates are sent', async () => {
    getCurrentUserProfile.mockResolvedValue({
      role: 'volunteer',
      status: 'approved',
    })
    listReportPins.mockResolvedValue([])

    await GET(
      requestFor(
        'http://localhost/api/reports?startDate=2020-01-01&endDate=2020-02-01',
      ),
    )

    const [, , range] = listReportPins.mock.calls[0]
    const twoMonthsAgo = new Date()
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
    expect(range.start.getTime()).toBeGreaterThan(
      twoMonthsAgo.getTime() - 2 * 24 * 60 * 60 * 1000,
    )
  })

  it('returns 400 when an admin sends a start date after the end date', async () => {
    getCurrentUserProfile.mockResolvedValue({
      role: 'admin',
      status: 'approved',
    })

    const response = await GET(
      requestFor(
        'http://localhost/api/reports?startDate=2025-03-31&endDate=2025-01-01',
      ),
    )

    expect(response.status).toBe(400)
    expect(listReportPins).not.toHaveBeenCalled()
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
