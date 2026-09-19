import type { Polygon, Position } from 'geojson'
import { LAVAL_BOUNDS } from '@/lib/mapbox/config'
import lavalBoundaryGeoJson from './laval-boundary.json'

export type ReportPosition = {
  latitude: number
  longitude: number
}

const [[west, south], [east, north]] = LAVAL_BOUNDS
const [LAVAL_BOUNDARY_RING] = (lavalBoundaryGeoJson as unknown as Polygon)
  .coordinates

export function clampToLavalBounds(position: ReportPosition): ReportPosition {
  return {
    latitude: clamp(position.latitude, south, north),
    longitude: clamp(position.longitude, west, east),
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function isInRing(
  position: ReportPosition,
  ring: readonly Position[],
): boolean {
  const x = position.longitude
  const y = position.latitude
  let inside = false

  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index++
  ) {
    const [currentX, currentY] = ring[index]
    const [previousX, previousY] = ring[previous]
    const intersects =
      currentY > y !== previousY > y &&
      x <
        ((previousX - currentX) * (y - currentY)) / (previousY - currentY) +
          currentX

    if (intersects) inside = !inside
  }

  return inside
}

/**
 * Whether a position falls within the municipal boundary of Laval (not just
 * the loose lat/lon bounding box used for the map's `maxBounds`), based on
 * `laval-boundary.json`.
 */
export function isWithinLavalBounds(position: ReportPosition): boolean {
  return isInRing(position, LAVAL_BOUNDARY_RING)
}
