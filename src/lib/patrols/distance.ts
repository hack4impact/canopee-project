const EARTH_RADIUS_M = 6_371_000

export type Coordinate = {
  latitude: number
  longitude: number
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/** Great-circle distance between two coordinates, in meters. */
export function haversineMeters(a: Coordinate, b: Coordinate): number {
  const dLat = toRadians(b.latitude - a.latitude)
  const dLon = toRadians(b.longitude - a.longitude)

  const sin =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      Math.sin(dLon / 2) ** 2

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(sin)))
}

/** Sum of the legs between consecutive points; 0 for fewer than two points. */
export function totalRouteMeters(points: readonly Coordinate[]): number {
  let total = 0

  for (let i = 1; i < points.length; i++) {
    total += haversineMeters(points[i - 1], points[i])
  }

  return total
}
