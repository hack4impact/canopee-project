import { afterEach, describe, expect, it, vi } from 'vitest'

const { readUploadToken } = vi.hoisted(() => ({
  readUploadToken: vi.fn(),
}))

vi.mock('@/lib/patrols/upload-token', () => ({ readUploadToken }))

const { POST } = await import('@/app/api/patrol-points/native/route')

afterEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/patrol-points/native', () => {
  it('returns 401 without a valid upload token', async () => {
    readUploadToken.mockReturnValue(null)

    const response = await POST(
      new Request('http://localhost/api/patrol-points/native', {
        method: 'POST',
        headers: { authorization: 'Bearer bad-token' },
      }),
    )

    expect(response.status).toBe(401)
  })
})
