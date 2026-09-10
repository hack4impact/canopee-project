import { afterEach, describe, expect, it, vi } from 'vitest'

class ForbiddenError extends Error {
  constructor() {
    super('forbidden')
  }
}

const { requireApprovedAccess, getActivePatrol } = vi.hoisted(() => ({
  requireApprovedAccess: vi.fn(),
  getActivePatrol: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  forbidden: () => {
    throw new ForbiddenError()
  },
}))

vi.mock('@/lib/auth/current-user', () => ({ requireApprovedAccess }))
vi.mock('@/lib/patrols/queries', () => ({ getActivePatrol }))

const { POST } = await import('@/app/api/patrol-points/route')

afterEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/patrol-points', () => {
  it('refuses a caller who is not an approved volunteer', async () => {
    requireApprovedAccess.mockImplementation(() => {
      throw new ForbiddenError()
    })

    await expect(
      POST(new Request('http://localhost', { method: 'POST' })),
    ).rejects.toBeInstanceOf(ForbiddenError)
    expect(getActivePatrol).not.toHaveBeenCalled()
  })
})
