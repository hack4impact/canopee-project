import { LAVAL_BOUNDS } from '@/lib/mapbox/config'

export type ReportPosition = {
  latitude: number
  longitude: number
}

const [[west, south], [east, north]] = LAVAL_BOUNDS

export function clampToLavalBounds(position: ReportPosition): ReportPosition {
  return {
    latitude: clamp(position.latitude, south, north),
    longitude: clamp(position.longitude, west, east),
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
