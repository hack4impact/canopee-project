const EARTH_RADIUS_METRES = 6371000

export type Coordinate = {
  latitude: number
  longitude: number
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function distanceBetweenMetres(a: Coordinate, b: Coordinate): number {
  const deltaLatitude = toRadians(b.latitude - a.latitude)
  const deltaLongitude = toRadians(b.longitude - a.longitude)

  const h =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      Math.sin(deltaLongitude / 2) ** 2

  return EARTH_RADIUS_METRES * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export function totalDistanceMetres(points: readonly Coordinate[]): number {
  let total = 0

  for (let index = 1; index < points.length; index += 1) {
    total += distanceBetweenMetres(points[index - 1], points[index])
  }

  return total
}
