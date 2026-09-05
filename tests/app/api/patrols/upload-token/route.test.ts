import { afterEach, describe, expect, it, vi } from 'vitest'

class ForbiddenError extends Error {
  constructor() {
    super('forbidden')
  }
}

const { requireApprovedAccess, createUploadToken } = vi.hoisted(() => ({
  requireApprovedAccess: vi.fn(),
  createUploadToken: vi.fn(),
}))

vi.mock('@/lib/auth/current-user', () => ({ requireApprovedAccess }))
vi.mock('@/lib/patrols/upload-token', () => ({ createUploadToken }))

const { GET } = await import('@/app/api/patrols/upload-token/route')

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/patrols/upload-token', () => {
  it('refuses a caller who is not an approved volunteer', async () => {
    requireApprovedAccess.mockImplementation(() => {
      throw new ForbiddenError()
    })

    await expect(GET()).rejects.toBeInstanceOf(ForbiddenError)
    expect(createUploadToken).not.toHaveBeenCalled()
  })

  it('returns a token for an approved volunteer', async () => {
    requireApprovedAccess.mockResolvedValue({
      id: 'user-1',
      role: 'volunteer',
      status: 'approved',
    })
    createUploadToken.mockReturnValue('signed-token')

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ token: 'signed-token' })
  })
})
