import type { FeatureCollection, Point } from 'geojson'

export const DEFAULT_ZONE_PRECISION = 4

export const DEFAULT_WINDOW_MONTHS = 2

export const MAX_WINDOW_MONTHS = 24

export type HeatmapZone = {
  latitude: number
  longitude: number
  points: number
  patrols: number
}

type ZoneProperties = {
  points: number
  patrols: number
}

export type HeatmapCollection = FeatureCollection<Point, ZoneProperties>

export function parseMonthsParam(value: string | null | undefined): number {
  const months = Number(value)

  if (!value || !Number.isInteger(months) || months < 1) {
    return DEFAULT_WINDOW_MONTHS
  }

  return Math.min(months, MAX_WINDOW_MONTHS)
}

export function windowStart(
  now: Date,
  months: number = DEFAULT_WINDOW_MONTHS,
): Date {
  const start = new Date(now)
  const day = start.getUTCDate()

  start.setUTCDate(1)
  start.setUTCMonth(start.getUTCMonth() - months)

  const lastDay = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0),
  ).getUTCDate()

  start.setUTCDate(Math.min(day, lastDay))

  return start
}

export function toFeatureCollection(
  zones: readonly HeatmapZone[],
): HeatmapCollection {
  return {
    type: 'FeatureCollection',
    features: zones.map((zone) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [zone.longitude, zone.latitude],
      },
      properties: { points: zone.points, patrols: zone.patrols },
    })),
  }
}

export function maxPoints(zones: readonly HeatmapZone[]): number {
  return zones.reduce((max, zone) => Math.max(max, zone.points), 0)
}
