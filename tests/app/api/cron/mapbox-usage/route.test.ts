import { afterEach, describe, expect, it, vi } from 'vitest'

const { selectWhere } = vi.hoisted(() => ({
  selectWhere: vi.fn(),
}))

vi.mock('@/db', () => ({
  db: {
    select: () => ({
      from: () => ({ where: selectWhere }),
    }),
  },
  mapLoadCounters: { month: 'month' },
}))

const { GET } = await import('@/app/api/cron/mapbox-usage/route')

const originalSecret = process.env.CRON_SECRET

afterEach(() => {
  vi.clearAllMocks()
  if (originalSecret === undefined) {
    delete process.env.CRON_SECRET
  } else {
    process.env.CRON_SECRET = originalSecret
  }
})

function requestWith(authorization?: string) {
  return new Request('http://localhost/api/cron/mapbox-usage', {
    headers: authorization ? { authorization } : {},
  })
}

describe('GET /api/cron/mapbox-usage', () => {
  it('returns 401 when CRON_SECRET is missing', async () => {
    delete process.env.CRON_SECRET

    const response = await GET(requestWith())

    expect(response.status).toBe(401)
    expect(selectWhere).not.toHaveBeenCalled()
  })

  it('returns 401 when the bearer token is wrong', async () => {
    process.env.CRON_SECRET = 'expected-secret'

    const response = await GET(requestWith('Bearer other-secret'))

    expect(response.status).toBe(401)
    expect(selectWhere).not.toHaveBeenCalled()
  })

  it('returns the usage payload when the bearer token matches', async () => {
    process.env.CRON_SECRET = 'expected-secret'
    selectWhere.mockResolvedValue([])

    const response = await GET(requestWith('Bearer expected-secret'))

    expect(response.status).toBe(200)
    expect(selectWhere).toHaveBeenCalled()
  })
})
