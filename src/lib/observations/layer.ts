import type { CircleLayerSpecification } from 'mapbox-gl'
import type { ObservationCategory } from '@/lib/observations/collection'

export const OBSERVATIONS_SOURCE_ID = 'fauna-flora-observations'

export const OBSERVATIONS_LAYER_ID = 'fauna-flora-observations-points'

export const OBSERVATION_COLOR = '#17aa55'

type LegendEntry = {
  category: ObservationCategory
  label: string
  color: string
}

export const OBSERVATION_LEGEND: readonly LegendEntry[] = [
  { category: 'reptile', label: 'Reptiles', color: OBSERVATION_COLOR },
  { category: 'insecte', label: 'Insectes', color: OBSERVATION_COLOR },
  { category: 'oiseau', label: 'Oiseaux', color: OBSERVATION_COLOR },
  { category: 'amphibien', label: 'Amphibiens', color: OBSERVATION_COLOR },
  { category: 'mammifere', label: 'Mammifères', color: OBSERVATION_COLOR },
  { category: 'invertebre', label: 'Invertébrés', color: OBSERVATION_COLOR },
  { category: 'mollusque', label: 'Mollusques', color: OBSERVATION_COLOR },
  { category: 'poisson', label: 'Poissons', color: OBSERVATION_COLOR },
  {
    category: 'plante_vasculaire',
    label: 'Plantes vasculaires',
    color: OBSERVATION_COLOR,
  },
  { category: 'bryophyte', label: 'Bryophytes', color: OBSERVATION_COLOR },
]

const LOW_ZOOM = 10

const HIGH_ZOOM = 16

export function observationsPaint(): CircleLayerSpecification['paint'] {
  return {
    'circle-color': OBSERVATION_COLOR,
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
