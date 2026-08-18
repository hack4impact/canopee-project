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
