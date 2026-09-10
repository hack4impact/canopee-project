import { describe, expect, it } from 'vitest'
import {
  capBuffer,
  classifySyncResponse,
  isAccurateEnough,
  isPlausibleStep,
  MAX_ACCURACY_METRES,
  describeSignalGap,
  isPermissionDenied,
  MAX_BATCH_POINTS,
  MAX_BUFFERED_POINTS,
  groupPointsByPatrol,
  parseNativeLocation,
  parseNativeLocationBatch,
  parsePatrolPointBatch,
  POINT_INTERVAL_MS,
  shouldRecordPoint,
  takeBatch,
  toRecordedPoint,
  type RecordedPoint,
} from '@/lib/patrols/points'

const SECOND = 1000
const MINUTE = 60 * SECOND

const PATROL_STARTED_AT = new Date('2026-08-11T14:00:00.000Z')
const NOW = new Date('2026-08-11T14:30:00.000Z')
const BOUNDS = { patrolStartedAt: PATROL_STARTED_AT, now: NOW }

function fix(latitude: number, longitude: number, timestamp: number) {
  return {
    coords: { latitude, longitude },
    timestamp,
  } as GeolocationPosition
}

function point(overrides: Partial<Record<keyof RecordedPoint, unknown>> = {}) {
  return {
    latitude: 45.5885,
    longitude: -73.723,
    recordedAt: '2026-08-11T14:10:00.000Z',
    ...overrides,
  }
}

function pointsOf(batch: ReturnType<typeof parsePatrolPointBatch>) {
  if ('error' in batch) {
    throw new Error(`expected a parsed batch, got: ${batch.error}`)
  }

  return batch.points
}

describe('shouldRecordPoint', () => {
  it('keeps the first fix, so a patrol has a starting point right away', () => {
    expect(shouldRecordPoint(null, 1_000)).toBe(true)
  })

  it('drops the fixes watchPosition fires between intervals', () => {
    expect(shouldRecordPoint(0, 1 * SECOND)).toBe(false)
    expect(shouldRecordPoint(0, POINT_INTERVAL_MS - 1)).toBe(false)
  })

  it('keeps a fix once the interval has elapsed', () => {
    expect(shouldRecordPoint(0, POINT_INTERVAL_MS)).toBe(true)
    expect(shouldRecordPoint(0, 30 * SECOND)).toBe(true)
  })

  it('records again after a backwards clock jump instead of stalling', () => {
    expect(shouldRecordPoint(10 * MINUTE, 1 * MINUTE)).toBe(true)
  })
})

describe('toRecordedPoint', () => {
  it('stamps the point with the fix, not with the moment it is sent', () => {
    const timestamp = Date.parse('2026-08-11T14:10:00.000Z')

    expect(toRecordedPoint(fix(45.5885, -73.723, timestamp))).toEqual({
      latitude: 45.5885,
      longitude: -73.723,
      recordedAt: '2026-08-11T14:10:00.000Z',
    })
  })

  it('sends raw coordinates, no smoothing', () => {
    const recorded = toRecordedPoint(fix(45.58851234, -73.72304999, 0))

    expect(recorded.latitude).toBe(45.58851234)
    expect(recorded.longitude).toBe(-73.72304999)
  })
})

describe('takeBatch', () => {
  it('sends everything when the buffer fits in one request', () => {
    const buffered = [point(), point()] as RecordedPoint[]

    expect(takeBatch(buffered)).toEqual(buffered)
  })

  it('sends the oldest points first, leaving the backlog for the next sync', () => {
    const buffered = Array.from({ length: MAX_BATCH_POINTS + 5 }, (_, index) =>
      point({ latitude: index }),
    ) as RecordedPoint[]

    const batch = takeBatch(buffered)

    expect(batch).toHaveLength(MAX_BATCH_POINTS)
    expect(batch[0].latitude).toBe(0)
    expect(batch.at(-1)?.latitude).toBe(MAX_BATCH_POINTS - 1)
  })

  it('leaves the buffer alone, so a failed sync can retry the same points', () => {
    const buffered = [point(), point()] as RecordedPoint[]

    takeBatch(buffered)

    expect(buffered).toHaveLength(2)
  })
})

describe('capBuffer', () => {
  it('leaves a healthy buffer alone', () => {
    const buffered = [point(), point()] as RecordedPoint[]

    expect(capBuffer(buffered)).toEqual(buffered)
  })

  it('sheds the oldest points so a long outage cannot exhaust memory', () => {
    const buffered = Array.from({ length: MAX_BUFFERED_POINTS + 3 }, (_, i) =>
      point({ latitude: i }),
    ) as RecordedPoint[]

    const capped = capBuffer(buffered)

    expect(capped).toHaveLength(MAX_BUFFERED_POINTS)
    expect(capped[0].latitude).toBe(3)
  })
})

describe('describeSignalGap', () => {
  it('says so when the signal drops before the first fix ever arrives', () => {
    expect(describeSignalGap(null, 10 * MINUTE)).toBe('no point recorded yet')
  })

  it('reports the gap in whole seconds', () => {
    expect(describeSignalGap(0, 45 * SECOND)).toBe('45s since the last point')
    expect(describeSignalGap(0, 45 * SECOND + 400)).toBe(
      '45s since the last point',
    )
  })

  it('does not report a negative gap when the clock jumps backwards', () => {
    expect(describeSignalGap(10 * MINUTE, 0)).toBe('0s since the last point')
  })
})

describe('isPermissionDenied', () => {
  it('is true only for a refusal, which no amount of waiting fixes', () => {
    expect(isPermissionDenied({ code: 1 })).toBe(true)
  })

  it('is false for a lost signal or a timeout, which resolve on their own', () => {
    expect(isPermissionDenied({ code: 2 })).toBe(false)
    expect(isPermissionDenied({ code: 3 })).toBe(false)
  })
})

describe('classifySyncResponse', () => {
  it('accepts a 2xx, the only proof the points reached the database', () => {
    expect(classifySyncResponse(200)).toBe('accepted')
    expect(classifySyncResponse(201)).toBe('accepted')
  })

  it('retries a 5xx, where the server failed rather than refused', () => {
    expect(classifySyncResponse(500)).toBe('retry')
    expect(classifySyncResponse(503)).toBe('retry')
  })

  it('gives up on a 4xx, which would be refused identically forever', () => {
    expect(classifySyncResponse(400)).toBe('fatal')
    expect(classifySyncResponse(409)).toBe('fatal')
  })

  it('gives up on status 0, the opaque redirect of an expired session', () => {
    expect(classifySyncResponse(0)).toBe('fatal')
  })
})

describe('parsePatrolPointBatch', () => {
  it('rejects a payload that is not an array', () => {
    expect(parsePatrolPointBatch({ latitude: 45 }, BOUNDS)).toEqual({
      error: expect.any(String),
    })
    expect(parsePatrolPointBatch(null, BOUNDS)).toEqual({
      error: expect.any(String),
    })
  })

  it('rejects an empty batch rather than making a pointless insert', () => {
    expect(parsePatrolPointBatch([], BOUNDS)).toEqual({
      error: expect.any(String),
    })
  })

  it('rejects a batch larger than a client should ever send', () => {
    const oversized = Array.from({ length: MAX_BATCH_POINTS + 1 }, () =>
      point(),
    )

    expect(parsePatrolPointBatch(oversized, BOUNDS)).toEqual({
      error: expect.any(String),
    })
  })

  it('formats coordinates to the six decimals the column stores', () => {
    const [row] = pointsOf(
      parsePatrolPointBatch(
        [point({ latitude: 45.58851234, longitude: -73.723 })],
        BOUNDS,
      ),
    )

    expect(row.latitude).toBe('45.588512')
    expect(row.longitude).toBe('-73.723000')
  })

  it('hands back a Date, so the driver does not have to parse the string', () => {
    const [row] = pointsOf(parsePatrolPointBatch([point()], BOUNDS))

    expect(row.recordedAt).toEqual(new Date('2026-08-11T14:10:00.000Z'))
  })

  it('drops coordinates that would overflow the column', () => {
    const batch = parsePatrolPointBatch(
      [
        point({ latitude: 91 }),
        point({ longitude: -181 }),
        point({ latitude: Number.NaN }),
        point({ latitude: Number.POSITIVE_INFINITY }),
        point({ latitude: '45.5885' }),
        point({ latitude: undefined }),
      ],
      BOUNDS,
    )

    expect(batch).toEqual({ points: [], dropped: 6 })
  })

  it('accepts the extremes of the coordinate range', () => {
    const batch = parsePatrolPointBatch(
      [point({ latitude: 90, longitude: 180 }), point({ latitude: -90 })],
      BOUNDS,
    )

    expect(pointsOf(batch)).toHaveLength(2)
  })

  it('drops entries that are not objects at all', () => {
    expect(parsePatrolPointBatch(['nope', null, 42], BOUNDS)).toEqual({
      points: [],
      dropped: 3,
    })
  })

  it('drops an unusable timestamp', () => {
    const batch = parsePatrolPointBatch(
      [
        point({ recordedAt: 'not a date' }),
        point({ recordedAt: NOW.getTime() }),
        point({ recordedAt: undefined }),
      ],
      BOUNDS,
    )

    expect(batch).toEqual({ points: [], dropped: 3 })
  })

  it('drops a point stamped before the patrol it belongs to', () => {
    const batch = parsePatrolPointBatch(
      [point({ recordedAt: '2026-08-11T13:50:00.000Z' })],
      BOUNDS,
    )

    expect(batch).toEqual({ points: [], dropped: 1 })
  })

  it('allows the first fix to land just before the patrol row', () => {
    const batch = parsePatrolPointBatch(
      [point({ recordedAt: '2026-08-11T13:59:30.000Z' })],
      BOUNDS,
    )

    expect(pointsOf(batch)).toHaveLength(1)
  })

  it('drops a point from a phone whose clock is far ahead', () => {
    const batch = parsePatrolPointBatch(
      [point({ recordedAt: '2026-08-11T15:00:00.000Z' })],
      BOUNDS,
    )

    expect(batch).toEqual({ points: [], dropped: 1 })
  })

  it('tolerates the few minutes of clock drift a real phone shows', () => {
    const batch = parsePatrolPointBatch(
      [point({ recordedAt: '2026-08-11T14:32:00.000Z' })],
      BOUNDS,
    )

    expect(pointsOf(batch)).toHaveLength(1)
  })

  it('keeps the good points in a batch that also holds a bad one', () => {
    const batch = parsePatrolPointBatch(
      [point(), point({ latitude: 999 }), point()],
      BOUNDS,
    )

    expect(batch).toEqual({ points: expect.any(Array), dropped: 1 })
    expect(pointsOf(batch)).toHaveLength(2)
  })
})

describe('isAccurateEnough', () => {
  it('keeps a normal outdoor fix', () => {
    expect(isAccurateEnough(8)).toBe(true)
    expect(isAccurateEnough(MAX_ACCURACY_METRES)).toBe(true)
  })

  it('drops a vague fix, the kind that lands the route inside a house', () => {
    expect(isAccurateEnough(MAX_ACCURACY_METRES + 1)).toBe(false)
    expect(isAccurateEnough(500)).toBe(false)
  })

  it('keeps a fix whose accuracy the device never reported', () => {
    expect(isAccurateEnough(null)).toBe(true)
    expect(isAccurateEnough(undefined)).toBe(true)
    expect(isAccurateEnough(Number.NaN)).toBe(true)
  })
})

describe('isPlausibleStep', () => {
  const from = {
    latitude: 45.5885,
    longitude: -73.723,
    recordedAt: '2026-08-11T14:10:00.000Z',
  } as RecordedPoint

  function after(seconds: number, latitude: number, longitude: number) {
    return {
      latitude,
      longitude,
      recordedAt: new Date(
        Date.parse(from.recordedAt) + seconds * SECOND,
      ).toISOString(),
    } as RecordedPoint
  }

  it('keeps the first point, which has nothing to be implausible against', () => {
    expect(isPlausibleStep(null, from)).toBe(true)
  })

  it('keeps a walking pace step', () => {
    expect(isPlausibleStep(from, after(12, 45.58865, -73.723))).toBe(true)
  })

  it('keeps jitter while standing still', () => {
    expect(isPlausibleStep(from, after(12, 45.58851, -73.72301))).toBe(true)
  })

  it('drops a jump no walker could have made', () => {
    expect(isPlausibleStep(from, after(12, 45.61, -73.723))).toBe(false)
  })

  it('allows a long stride again once the signal has been gone a while', () => {
    expect(isPlausibleStep(from, after(600, 45.61, -73.723))).toBe(true)
  })

  it('keeps a point whose clock went backwards rather than guessing', () => {
    expect(isPlausibleStep(from, after(-60, 45.61, -73.723))).toBe(true)
  })
})

describe('parseNativeLocation', () => {
  const body = {
    latitude: 45.5885,
    longitude: -73.723,
    accuracy: 8,
    time: Date.parse('2026-08-27T12:00:00.000Z'),
    source: 'native',
  }

  it('reads the point and the accuracy from a native post', () => {
    expect(parseNativeLocation(body)).toEqual({
      point: {
        latitude: 45.5885,
        longitude: -73.723,
        recordedAt: '2026-08-27T12:00:00.000Z',
      },
      accuracy: 8,
    })
  })

  it('rejects a body with no usable timestamp', () => {
    expect(parseNativeLocation({ ...body, time: null })).toBeNull()
  })

  it('rejects coordinates outside the column range', () => {
    expect(parseNativeLocation({ ...body, latitude: 91 })).toBeNull()
    expect(parseNativeLocation({ ...body, longitude: -181 })).toBeNull()
  })

  it('keeps the point when accuracy is missing', () => {
    const parsed = parseNativeLocation({ ...body, accuracy: undefined })

    expect(parsed?.accuracy).toBeNull()
    expect(parsed?.point.latitude).toBe(45.5885)
  })

  it('rejects anything that is not an object', () => {
    expect(parseNativeLocation(null)).toBeNull()
    expect(parseNativeLocation('nope')).toBeNull()
  })
})

describe('parseNativeLocationBatch', () => {
  const body = {
    latitude: 45.5885,
    longitude: -73.723,
    accuracy: 8,
    time: Date.parse('2026-08-27T12:00:00.000Z'),
    source: 'native',
  }

  it('reads a single body, so an older build keeps working', () => {
    const parsed = parseNativeLocationBatch(body)

    expect('error' in parsed).toBe(false)
    expect(!('error' in parsed) && parsed.locations).toHaveLength(1)
  })

  it('reads an array of bodies', () => {
    const parsed = parseNativeLocationBatch([
      body,
      { ...body, time: body.time + 12_000 },
    ])

    expect(!('error' in parsed) && parsed.locations).toHaveLength(2)
    expect(!('error' in parsed) && parsed.dropped).toBe(0)
  })

  it('drops only the unusable points, so one bad point cannot block the queue', () => {
    const parsed = parseNativeLocationBatch([
      body,
      { ...body, latitude: 91 },
      { ...body, time: null },
    ])

    expect(!('error' in parsed) && parsed.locations).toHaveLength(1)
    expect(!('error' in parsed) && parsed.dropped).toBe(2)
  })

  it('drops points the GPS was too unsure of', () => {
    const parsed = parseNativeLocationBatch([body, { ...body, accuracy: 500 }])

    expect(!('error' in parsed) && parsed.locations).toHaveLength(1)
    expect(!('error' in parsed) && parsed.dropped).toBe(1)
  })

  it('refuses a batch larger than the server accepts', () => {
    const parsed = parseNativeLocationBatch(
      Array.from({ length: MAX_BATCH_POINTS + 1 }, () => body),
    )

    expect('error' in parsed).toBe(true)
  })

  it('accepts an empty array', () => {
    const parsed = parseNativeLocationBatch([])

    expect(!('error' in parsed) && parsed.locations).toHaveLength(0)
  })
})

describe('groupPointsByPatrol', () => {
  const now = new Date('2026-08-27T18:00:00.000Z')

  const finished = {
    id: 'finished',
    startedAt: new Date('2026-08-27T09:00:00.000Z'),
    endedAt: new Date('2026-08-27T10:00:00.000Z'),
  }

  const running = {
    id: 'running',
    startedAt: new Date('2026-08-27T17:00:00.000Z'),
    endedAt: null,
  }

  function pointAt(at: string): RecordedPoint {
    return { latitude: 45.5885, longitude: -73.723, recordedAt: at }
  }

  it('sends a late point back to the patrol it was walked on', () => {
    const { groups, dropped } = groupPointsByPatrol(
      [pointAt('2026-08-27T09:30:00.000Z')],
      [running, finished],
      now,
    )

    expect(dropped).toBe(0)
    expect(groups).toHaveLength(1)
    expect(groups[0].patrolId).toBe('finished')
  })

  it('splits a batch that spans two patrols', () => {
    const { groups } = groupPointsByPatrol(
      [
        pointAt('2026-08-27T09:30:00.000Z'),
        pointAt('2026-08-27T17:30:00.000Z'),
        pointAt('2026-08-27T09:45:00.000Z'),
      ],
      [running, finished],
      now,
    )

    const byId = Object.fromEntries(groups.map((g) => [g.patrolId, g.points]))

    expect(byId.finished).toHaveLength(2)
    expect(byId.running).toHaveLength(1)
  })

  it('keeps a point captured just before the patrol row existed', () => {
    const { groups, dropped } = groupPointsByPatrol(
      [pointAt('2026-08-27T08:59:30.000Z')],
      [finished],
      now,
    )

    expect(dropped).toBe(0)
    expect(groups[0].patrolId).toBe('finished')
  })

  it('drops a point that belongs to no patrol', () => {
    const { groups, dropped } = groupPointsByPatrol(
      [pointAt('2026-08-27T13:00:00.000Z')],
      [running, finished],
      now,
    )

    expect(groups).toHaveLength(0)
    expect(dropped).toBe(1)
  })

  it('does not accept a point recorded after a patrol ended', () => {
    const { dropped } = groupPointsByPatrol(
      [pointAt('2026-08-27T10:30:00.000Z')],
      [finished],
      now,
    )

    expect(dropped).toBe(1)
  })
})
