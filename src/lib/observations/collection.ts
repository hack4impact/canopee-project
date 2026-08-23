import type { FeatureCollection, Point } from 'geojson'
import type { ReportCategory } from '@/lib/reports/queries'

export const OBSERVATION_CATEGORIES = [
  'reptile',
  'insecte',
  'oiseau',
  'amphibien',
  'mammifere',
  'invertebre',
  'mollusque',
  'poisson',
  'plante_vasculaire',
  'bryophyte',
] as const satisfies readonly ReportCategory[]

export type ObservationCategory = (typeof OBSERVATION_CATEGORIES)[number]

export type Observation = {
  id: string
  category: ObservationCategory
  latitude: number
  longitude: number
}

type ObservationProperties = {
  id: string
  category: ObservationCategory
}

export type ObservationCollection = FeatureCollection<
  Point,
  ObservationProperties
>

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
        category: observation.category,
      },
    })),
  }
}
