import type { CircleLayerSpecification } from 'mapbox-gl'
import type { ObservationCategory } from '@/lib/observations/collection'

export const OBSERVATIONS_SOURCE_ID = 'fauna-flora-observations'

export const OBSERVATIONS_LAYER_ID = 'fauna-flora-observations-points'

export const FAUNA_COLOR = '#f06053'

export const FLORA_COLOR = '#17aa55'

type LegendEntry = {
  category: ObservationCategory
  label: string
  color: string
}

export const OBSERVATION_LEGEND: readonly LegendEntry[] = [
  { category: 'fauna_observation', label: 'Faune', color: FAUNA_COLOR },
  { category: 'flora_observation', label: 'Flore', color: FLORA_COLOR },
]

const LOW_ZOOM = 10

const HIGH_ZOOM = 16

export function observationsPaint(): CircleLayerSpecification['paint'] {
  return {
    'circle-color': [
      'match',
      ['get', 'category'],
      'fauna_observation',
      FAUNA_COLOR,
      'flora_observation',
      FLORA_COLOR,
      FLORA_COLOR,
    ],
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['zoom'],
      LOW_ZOOM,
      4,
      HIGH_ZOOM,
      10,
    ],
    'circle-stroke-width': 1.5,
    'circle-stroke-color': '#f6f4df',
    'circle-opacity': 0.9,
  }
}
