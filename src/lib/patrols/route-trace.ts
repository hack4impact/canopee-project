import type { Coordinate } from '@/lib/patrols/distance'

export const MAX_TRACE_POINTS = 30

export function normalizeRoute(
  points: Coordinate[],
  maxPoints = MAX_TRACE_POINTS,
): number[] {
  if (points.length < 2) {
    return []
  }

  const step = Math.max(1, Math.ceil(points.length / maxPoints))
  const sampled = points.filter((_, index) => index % step === 0)
  const last = points[points.length - 1]

  if (sampled[sampled.length - 1] !== last) {
    sampled.push(last)
  }

  const latitudes = sampled.map((point) => point.latitude)
  const longitudes = sampled.map((point) => point.longitude)

  const minLatitude = Math.min(...latitudes)
  const minLongitude = Math.min(...longitudes)
  const spanLatitude = Math.max(...latitudes) - minLatitude
  const spanLongitude = Math.max(...longitudes) - minLongitude
  const span = Math.max(spanLatitude, spanLongitude)

  if (span === 0) {
    return []
  }

  const offsetX = (span - spanLongitude) / 2
  const offsetY = (span - spanLatitude) / 2

  const trace: number[] = []

  for (const point of sampled) {
    trace.push(
      Number(((point.longitude - minLongitude + offsetX) / span).toFixed(4)),
      Number(((point.latitude - minLatitude + offsetY) / span).toFixed(4)),
    )
  }

  return trace
}
