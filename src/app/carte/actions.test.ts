import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

class ForbiddenError extends Error {
  constructor() {
    super('forbidden')
  }
}

const {
  getActivePatrol,
  insert,
  patrolsTable,
  requireApprovedAccess,
  revalidatePath,
  values,
} = vi.hoisted(() => {
  const values = vi.fn()

  return {
    values,
    insert: vi.fn(() => ({ values })),
    getActivePatrol: vi.fn(),
    requireApprovedAccess: vi.fn(),
    revalidatePath: vi.fn(),
    patrolsTable: { table: 'patrols' },
  }
})

vi.mock('@/db', () => ({ db: { insert }, patrols: patrolsTable }))
vi.mock('next/cache', () => ({ revalidatePath }))
vi.mock('@/lib/auth/current-user', () => ({ requireApprovedAccess }))
vi.mock('@/lib/patrols/queries', () => ({ getActivePatrol }))

const { startPatrol } = await import('./actions')

const CALLER = { id: 'user-1', role: 'volunteer', status: 'approved' }

beforeEach(() => {
  vi.clearAllMocks()
  requireApprovedAccess.mockResolvedValue(CALLER)
  getActivePatrol.mockResolvedValue(null)
  values.mockResolvedValue(undefined)
})

afterEach(() => {
  // Unpatches the console spies below, which outlive their tests otherwise.
  vi.restoreAllMocks()
})

describe('startPatrol authorization', () => {
  it('checks the caller before touching the database', async () => {
    requireApprovedAccess.mockRejectedValue(new ForbiddenError())

    await expect(startPatrol()).rejects.toThrow(ForbiddenError)

    expect(getActivePatrol).not.toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
  })

  it('demands at least a volunteer, so a citizen cannot patrol', async () => {
    await startPatrol()

    expect(requireApprovedAccess).toHaveBeenCalledWith('volunteer')
  })
})

describe('startPatrol opening a patrol', () => {
  it('inserts a patrol row for the signed-in user', async () => {
    await startPatrol()

    expect(insert).toHaveBeenCalledWith(patrolsTable)
    expect(values).toHaveBeenCalledWith({ userId: CALLER.id })
  })

  it('sends no timestamps, leaving started_at to the database', async () => {
    await startPatrol()

    // A `startedAt` here would mean trusting the phone's clock instead.
    expect(Object.keys(values.mock.calls[0][0])).toEqual(['userId'])
  })

  it('refreshes the map so the badge replaces the button', async () => {
    await startPatrol()

    expect(revalidatePath).toHaveBeenCalledWith('/carte')
  })

  it('reports no error on success', async () => {
    await expect(startPatrol()).resolves.toEqual({})
  })
})

describe('startPatrol when one is already running', () => {
  beforeEach(() => {
    getActivePatrol.mockResolvedValue({ id: 'patrol-1' })
  })

  it('looks the running patrol up for the caller, not globally', async () => {
    await startPatrol()

    expect(getActivePatrol).toHaveBeenCalledWith(CALLER.id)
  })

  it('does not open a second one', async () => {
    await startPatrol()

    expect(insert).not.toHaveBeenCalled()
  })

  it('still refreshes the map, so a double tap lands on the badge', async () => {
    await expect(startPatrol()).resolves.toEqual({})

    expect(revalidatePath).toHaveBeenCalledWith('/carte')
  })
})

describe('startPatrol when the insert fails', () => {
  beforeEach(() => {
    values.mockRejectedValue(new Error('connection lost'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('returns a message rather than throwing at the patroller', async () => {
    await expect(startPatrol()).resolves.toEqual({
      message: 'Impossible de démarrer la patrouille. Réessayez.',
    })
  })

  it('logs the cause', async () => {
    await startPatrol()

    expect(console.error).toHaveBeenCalled()
  })

  it('does not claim the map changed', async () => {
    await startPatrol()

    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
