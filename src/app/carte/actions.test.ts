import { beforeEach, describe, expect, it, vi } from 'vitest'

class ForbiddenError extends Error {
  constructor() {
    super('forbidden')
  }
}

const {
  getActivePatrol,
  insert,
  values,
  select,
  orderBy,
  update,
  set,
  whereUpdate,
  patrolsTable,
  patrolPointsTable,
  requireApprovedAccess,
  revalidatePath,
} = vi.hoisted(() => {
  const values = vi.fn()

  const orderBy = vi.fn()
  const whereSelect = vi.fn(() => ({ orderBy }))
  const from = vi.fn(() => ({ where: whereSelect }))
  const select = vi.fn(() => ({ from }))

  const whereUpdate = vi.fn()
  const set = vi.fn(() => ({ where: whereUpdate }))
  const update = vi.fn(() => ({ set }))

  return {
    values,
    insert: vi.fn(() => ({ values })),
    select,
    orderBy,
    update,
    set,
    whereUpdate,
    getActivePatrol: vi.fn(),
    requireApprovedAccess: vi.fn(),
    revalidatePath: vi.fn(),
    patrolsTable: { table: 'patrols' },
    patrolPointsTable: { table: 'patrol_points' },
  }
})

vi.mock('@/db', () => ({
  db: { insert, select, update },
  patrols: patrolsTable,
  patrolPoints: patrolPointsTable,
}))
vi.mock('next/cache', () => ({ revalidatePath }))
vi.mock('@/lib/auth/current-user', () => ({ requireApprovedAccess }))
vi.mock('@/lib/patrols/queries', () => ({ getActivePatrol }))
vi.mock('drizzle-orm', () => ({ asc: vi.fn(), eq: vi.fn() }))

const { startPatrol, endPatrol } = await import('./actions')

const CALLER = { id: 'user-1', role: 'volunteer', status: 'approved' }

function lastUpdate(): { endedAt: Date; distanceMeters: number } {
  return (
    set.mock.calls[0] as unknown as [{ endedAt: Date; distanceMeters: number }]
  )[0]
}

beforeEach(() => {
  vi.clearAllMocks()
  requireApprovedAccess.mockResolvedValue(CALLER)
  getActivePatrol.mockResolvedValue(null)
  values.mockResolvedValue(undefined)
  orderBy.mockResolvedValue([])
  whereUpdate.mockResolvedValue(undefined)
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

describe('endPatrol authorization', () => {
  it('checks the caller before touching the database', async () => {
    requireApprovedAccess.mockRejectedValue(new ForbiddenError())

    await expect(endPatrol()).rejects.toThrow(ForbiddenError)

    expect(getActivePatrol).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('demands at least a volunteer', async () => {
    await endPatrol()

    expect(requireApprovedAccess).toHaveBeenCalledWith('volunteer')
  })
})

describe('endPatrol with no running patrol', () => {
  it('does nothing but still refreshes the map', async () => {
    await expect(endPatrol()).resolves.toEqual({})

    expect(update).not.toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalledWith('/carte')
  })
})

describe('endPatrol closing a patrol', () => {
  beforeEach(() => {
    getActivePatrol.mockResolvedValue({ id: 'patrol-1', startedAt: new Date() })
  })

  it('reads the points for that patrol, ordered', async () => {
    await endPatrol()

    expect(select).toHaveBeenCalled()
    expect(orderBy).toHaveBeenCalled()
  })

  it('stamps ended_at and stores the route distance', async () => {
    orderBy.mockResolvedValue([
      { latitude: '45.500000', longitude: '-73.600000' },
      { latitude: '45.510000', longitude: '-73.600000' },
    ])

    await endPatrol()

    const written = lastUpdate()
    expect(written.endedAt).toBeInstanceOf(Date)
    // ~0.01° of latitude is about 1.11 km.
    expect(written.distanceMeters).toBeGreaterThan(1100)
    expect(written.distanceMeters).toBeLessThan(1130)
  })

  it('stores zero distance (never null) for a route with no points', async () => {
    orderBy.mockResolvedValue([])

    await endPatrol()

    expect(lastUpdate().distanceMeters).toBe(0)
  })

  it('refreshes the map so the button replaces the badge', async () => {
    await endPatrol()

    expect(revalidatePath).toHaveBeenCalledWith('/carte')
  })

  it('reports no error on success', async () => {
    await expect(endPatrol()).resolves.toEqual({})
  })
})

describe('endPatrol when the update fails', () => {
  beforeEach(() => {
    getActivePatrol.mockResolvedValue({ id: 'patrol-1', startedAt: new Date() })
    whereUpdate.mockRejectedValue(new Error('connection lost'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('returns a message rather than throwing at the patroller', async () => {
    await expect(endPatrol()).resolves.toEqual({
      message: 'Impossible de terminer la patrouille. Réessayez.',
    })
  })

  it('does not claim the map changed', async () => {
    await endPatrol()

    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
