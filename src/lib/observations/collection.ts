import type { FeatureCollection, Point } from 'geojson'
import type { ReportCategory } from '@/lib/reports/queries'

export const OBSERVATION_CATEGORIES = [
  'fauna_observation',
  'flora_observation',
] as const satisfies readonly ReportCategory[]

export type ObservationCategory = (typeof OBSERVATION_CATEGORIES)[number]

export type Observation = {
  id: string
  eventNumber: number
  category: ObservationCategory
  latitude: number
  longitude: number
}

type ObservationProperties = {
  id: string
  eventNumber: number
  category: ObservationCategory
}

export type ObservationCollection = FeatureCollection<
  Point,
  ObservationProperties
>

export function isObservationCategory(
  value: string,
): value is ObservationCategory {
  return (OBSERVATION_CATEGORIES as readonly string[]).includes(value)
}

export function toFeatureCollection(
  observations: readonly Observation[],
): ObservationCollection {
  return {
    type: 'FeatureCollection',
    features: observations.map((observation) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [observation.longitude, observation.latitude],
      },
      properties: {
        id: observation.id,
        eventNumber: observation.eventNumber,
        category: observation.category,
      },
    })),
  }
}
