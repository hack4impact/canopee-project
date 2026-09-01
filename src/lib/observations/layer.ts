import type { SymbolLayerSpecification } from 'mapbox-gl'
import { reportPinSvg } from '@/lib/reports/group-style'
import type { ObservationCategory } from '@/lib/observations/collection'

export const OBSERVATIONS_SOURCE_ID = 'fauna-flora-observations'

export const OBSERVATIONS_LAYER_ID = 'fauna-flora-observations-points'

export const OBSERVATION_COLOR = '#17aa55'

export const OBSERVATION_PIN_IMAGE_ID = 'observation-pin'

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
  { category: 'faune_flore_other', label: 'Autres', color: OBSERVATION_COLOR },
]

const LOW_ZOOM = 10

const HIGH_ZOOM = 16

/** The teardrop pin reuses the faune/flore pictogram of the reporting form. */
export function observationPinSvg(scale = 2): string {
  return reportPinSvg('faune_flore', scale)
}

export function observationPinLayout(): SymbolLayerSpecification['layout'] {
  return {
    'icon-image': OBSERVATION_PIN_IMAGE_ID,
    'icon-size': [
      'interpolate',
      ['linear'],
      ['zoom'],
      LOW_ZOOM,
      0.65,
      HIGH_ZOOM,
      1,
    ],
    'icon-anchor': 'bottom',
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
  }
}
