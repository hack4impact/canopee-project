import { afterEach, describe, expect, it, vi } from 'vitest'

const { createCitizenReport, countRecentCitizenReports } = vi.hoisted(() => ({
  createCitizenReport: vi.fn(),
  countRecentCitizenReports: vi.fn(),
}))

vi.mock('@/lib/reports/submit', () => ({ createCitizenReport }))
vi.mock('@/lib/reports/queries', () => ({ countRecentCitizenReports }))

const { POST } = await import('@/app/api/public/reports/route')

afterEach(() => {
  vi.clearAllMocks()
})

function formRequest(fields: Record<string, string>) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value)
  }

  return {
    formData: async () => formData,
  } as Parameters<typeof POST>[0]
}

describe('POST /api/public/reports', () => {
  it('accepts a citizen with no account', async () => {
    countRecentCitizenReports.mockResolvedValue(0)
    createCitizenReport.mockResolvedValue({ submittedId: 'new-id' })

    const response = await POST(
      formRequest({ reporterEmail: 'citoyen@example.org' }),
    )

    expect(response.status).toBe(200)
    expect(createCitizenReport).toHaveBeenCalled()
  })

  it('returns 409 when the client id collides with another report', async () => {
    countRecentCitizenReports.mockResolvedValue(0)
    createCitizenReport.mockResolvedValue({
      conflict: true,
      message: 'Ce signalement n’a pas pu être enregistré. Réessayez.',
    })

    const response = await POST(
      formRequest({ reporterEmail: 'citoyen@example.org' }),
    )

    expect(response.status).toBe(409)
  })
})
