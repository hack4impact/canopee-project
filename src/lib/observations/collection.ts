import type { FeatureCollection, Point } from 'geojson'
import {
  reportGroupOfCategory,
  type ReportCategory,
  type ReportGroup,
} from '@/lib/reports/categories'

export const OBSERVATION_CATEGORIES = [
  'reptile',
  'insecte',
  'oiseau',
  'amphibien',
  'mammifere',
  'invertebre',
  'mollusque',
  'poisson',
  'espece_menacee',
  'espece_exotique',
  'faune_flore_other',
] as const satisfies readonly ReportCategory[]

export type ObservationCategory = (typeof OBSERVATION_CATEGORIES)[number]

export type Observation = {
  id: string
  eventNumber: number
  category: ObservationCategory
  latitude: number
  longitude: number
  species: string | null
  hasPhoto: boolean
  createdAt: string
  resolvedAt: string | null
}

type ObservationProperties = {
  id: string
  eventNumber: number
  category: ObservationCategory
  group: ReportGroup
  species: string | null
  hasPhoto: boolean
  createdAt: string
  resolved: boolean
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
        eventNumber: observation.eventNumber,
        category: observation.category,
        group: reportGroupOfCategory(observation.category),
        species: observation.species,
        hasPhoto: observation.hasPhoto,
        createdAt: observation.createdAt,
        resolved: observation.resolvedAt !== null,
      },
    })),
  }
}
