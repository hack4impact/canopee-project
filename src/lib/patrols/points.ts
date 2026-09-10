import { distanceBetweenMetres } from '@/lib/patrols/distance'

export const POINT_INTERVAL_MS = 12_000

export const SYNC_INTERVAL_MS = 60_000

export const MAX_BATCH_POINTS = 200

export const MAX_BUFFERED_POINTS = 1_000

const COORDINATE_SCALE = 6

const CLOCK_SKEW_MS = 5 * 60_000

const PATROL_START_GRACE_MS = 60_000

export type RecordedPoint = {
  latitude: number
  longitude: number
  recordedAt: string
}

export type PatrolPointRow = {
  latitude: string
  longitude: string
  recordedAt: Date
}

export type PatrolPointBatch =
  { error: string } | { points: PatrolPointRow[]; dropped: number }

type BatchBounds = {
  patrolStartedAt: Date
  now: Date
}

/** `watchPosition` fires as fast as the device produces fixes. */
export function shouldRecordPoint(
  lastRecordedAtMs: number | null,
  nowMs: number,
): boolean {
  if (lastRecordedAtMs === null) {
    return true
  }

  const sinceLast = nowMs - lastRecordedAtMs

  // A backwards clock jump would otherwise stall recording until time caught up.
  return sinceLast < 0 || sinceLast >= POINT_INTERVAL_MS
}

export function toRecordedPoint(position: GeolocationPosition): RecordedPoint {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    recordedAt: new Date(position.timestamp).toISOString(),
  }
}

export function takeBatch(buffered: RecordedPoint[]): RecordedPoint[] {
  return buffered.slice(0, MAX_BATCH_POINTS)
}

/** Sheds the oldest points so hours of failed syncs cannot exhaust memory. */
export function capBuffer(buffered: RecordedPoint[]): RecordedPoint[] {
  if (buffered.length <= MAX_BUFFERED_POINTS) {
    return buffered
  }

  return buffered.slice(-MAX_BUFFERED_POINTS)
}

export function describeSignalGap(
  lastRecordedAtMs: number | null,
  nowMs: number,
): string {
  if (lastRecordedAtMs === null) {
    return 'no point recorded yet'
  }

  const seconds = Math.max(0, Math.round((nowMs - lastRecordedAtMs) / 1000))

  return `${seconds}s since the last point`
}

export function isPermissionDenied(
  error: Pick<GeolocationPositionError, 'code'>,
): boolean {
  return error.code === 1
}

export type SyncOutcome = 'accepted' | 'retry' | 'fatal'

export function classifySyncResponse(status: number): SyncOutcome {
  if (status >= 200 && status < 300) {
    return 'accepted'
  }

  if (status >= 500) {
    return 'retry'
  }

  return 'fatal'
}

export function parsePatrolPointBatch(
  payload: unknown,
  bounds: BatchBounds,
): PatrolPointBatch {
  if (!Array.isArray(payload)) {
    return { error: 'Expected an array of points.' }
  }

  if (payload.length === 0) {
    return { error: 'Expected at least one point.' }
  }

  if (payload.length > MAX_BATCH_POINTS) {
    return { error: `Expected at most ${MAX_BATCH_POINTS} points.` }
  }

  const earliest = bounds.patrolStartedAt.getTime() - PATROL_START_GRACE_MS
  const latest = bounds.now.getTime() + CLOCK_SKEW_MS

  // One bad reading does not invalidate the walk around it, so points are
  // dropped individually rather than failing the whole request.
  const points = payload
    .map((candidate) => toPatrolPointRow(candidate, earliest, latest))
    .filter((row): row is PatrolPointRow => row !== null)

  return { points, dropped: payload.length - points.length }
}

function toPatrolPointRow(
  candidate: unknown,
  earliest: number,
  latest: number,
): PatrolPointRow | null {
  if (typeof candidate !== 'object' || candidate === null) {
    return null
  }

  const { latitude, longitude, recordedAt } =
    candidate as Partial<RecordedPoint>

  if (!isCoordinate(latitude, 90) || !isCoordinate(longitude, 180)) {
    return null
  }

  if (typeof recordedAt !== 'string') {
    return null
  }

  const recorded = new Date(recordedAt)
  const recordedMs = recorded.getTime()

  if (
    Number.isNaN(recordedMs) ||
    recordedMs < earliest ||
    recordedMs > latest
  ) {
    return null
  }

  return {
    latitude: latitude.toFixed(COORDINATE_SCALE),
    longitude: longitude.toFixed(COORDINATE_SCALE),
    recordedAt: recorded,
  }
}

/** Out-of-range values would overflow `decimal(9, 6)` and fail the insert. */
function isCoordinate(value: unknown, limit: number): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Math.abs(value) <= limit
  )
}

export const MAX_ACCURACY_METRES = 50

export const MAX_STEP_SPEED_MPS = 8

export const STEP_NOISE_TOLERANCE_METRES = 25

export function isAccurateEnough(accuracy: number | null | undefined): boolean {
  if (typeof accuracy !== 'number' || !Number.isFinite(accuracy)) {
    return true
  }

  return accuracy <= MAX_ACCURACY_METRES
}

export type NativeLocationBody = {
  point: RecordedPoint
  accuracy: number | null
}

export function parseNativeLocation(
  payload: unknown,
): NativeLocationBody | null {
  if (typeof payload !== 'object' || payload === null) {
    return null
  }

  const { latitude, longitude, time, accuracy } = payload as Record<
    string,
    unknown
  >

  if (!isCoordinate(latitude, 90) || !isCoordinate(longitude, 180)) {
    return null
  }

  const recordedMs =
    typeof time === 'number' && Number.isFinite(time) ? time : null

  if (recordedMs === null) {
    return null
  }

  return {
    point: {
      latitude,
      longitude,
      recordedAt: new Date(recordedMs).toISOString(),
    },
    accuracy:
      typeof accuracy === 'number' && Number.isFinite(accuracy)
        ? accuracy
        : null,
  }
}

export type NativeLocationBatch = {
  locations: NativeLocationBody[]
  dropped: number
}

export function parseNativeLocationBatch(
  payload: unknown,
): NativeLocationBatch | { error: string } {
  const items = Array.isArray(payload) ? payload : [payload]

  if (items.length > MAX_BATCH_POINTS) {
    return { error: `Expected at most ${MAX_BATCH_POINTS} points.` }
  }

  const locations: NativeLocationBody[] = []
  let dropped = 0

  for (const item of items) {
    const location = parseNativeLocation(item)

    if (location === null || !isAccurateEnough(location.accuracy)) {
      dropped += 1
      continue
    }

    locations.push(location)
  }

  return { locations, dropped }
}

export type PatrolWindow = {
  id: string
  startedAt: Date
  endedAt: Date | null
}

export type PatrolGroup = {
  patrolId: string
  startedAt: Date
  points: RecordedPoint[]
}

export function groupPointsByPatrol(
  points: RecordedPoint[],
  windows: PatrolWindow[],
  now: Date,
): { groups: PatrolGroup[]; dropped: number } {
  const groups = new Map<string, PatrolGroup>()
  let dropped = 0

  for (const point of points) {
    const recordedMs = Date.parse(point.recordedAt)

    if (Number.isNaN(recordedMs)) {
      dropped += 1
      continue
    }

    const window = windows.find((candidate) => {
      const earliest = candidate.startedAt.getTime() - PATROL_START_GRACE_MS
      const latest =
        (candidate.endedAt ?? now).getTime() +
        (candidate.endedAt ? 0 : CLOCK_SKEW_MS)

      return recordedMs >= earliest && recordedMs <= latest
    })

    if (!window) {
      dropped += 1
      continue
    }

    const group = groups.get(window.id)

    if (group) {
      group.points.push(point)
      continue
    }

    groups.set(window.id, {
      patrolId: window.id,
      startedAt: window.startedAt,
      points: [point],
    })
  }

  return { groups: [...groups.values()], dropped }
}

export function isPlausibleStep(
  previous: RecordedPoint | null,
  next: RecordedPoint,
): boolean {
  if (previous === null) {
    return true
  }

  const elapsedMs =
    Date.parse(next.recordedAt) - Date.parse(previous.recordedAt)

  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) {
    return true
  }

  const allowed =
    STEP_NOISE_TOLERANCE_METRES + (elapsedMs / 1000) * MAX_STEP_SPEED_MPS

  return distanceBetweenMetres(previous, next) <= allowed
}
