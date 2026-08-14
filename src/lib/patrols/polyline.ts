export const MIN_ROUTE_POINTS = 2

export type RoutePoint = {
  latitude: number
  longitude: number
}

export type LngLat = [number, number]

export function toLineCoordinates(points: readonly RoutePoint[]): LngLat[] {
  return points.map((point) => [point.longitude, point.latitude])
}

export function hasDrawableRoute(points: readonly RoutePoint[]): boolean {
  return points.length >= MIN_ROUTE_POINTS
}

export function routeBounds(
  coordinates: readonly LngLat[],
): [LngLat, LngLat] | null {
  if (coordinates.length === 0) {
    return null
  }

  let [west, south] = coordinates[0]
  let [east, north] = coordinates[0]

  for (const [longitude, latitude] of coordinates) {
    west = Math.min(west, longitude)
    east = Math.max(east, longitude)
    south = Math.min(south, latitude)
    north = Math.max(north, latitude)
  }

  return [
    [west, south],
    [east, north],
  ]
}
