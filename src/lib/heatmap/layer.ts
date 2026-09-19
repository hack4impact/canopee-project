import type { HeatmapLayerSpecification } from 'mapbox-gl'

export const HEATMAP_SOURCE_ID = 'patrol-heatmap'

export const HEATMAP_LAYER_ID = 'patrol-heatmap-density'

const LOW_ZOOM = 10

const GROUND_ZOOM = 14

const HIGH_ZOOM = 16

const MAX_ZOOM = 20

export function weightCeiling(maxPoints: number): number {
  return Math.log10(Math.max(1, maxPoints) + 1)
}

type HeatmapPaint = NonNullable<HeatmapLayerSpecification['paint']>

export function heatmapWeight(
  maxPoints: number,
): HeatmapPaint['heatmap-weight'] {
  return [
    'interpolate',
    ['linear'],
    ['log10', ['+', ['get', 'points'], 1]],
    0,
    0,
    weightCeiling(maxPoints),
    1,
  ]
}

export function heatmapPaint(maxPoints: number): HeatmapPaint {
  return {
    'heatmap-weight': heatmapWeight(maxPoints),
    'heatmap-intensity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      LOW_ZOOM,
      0.25,
      GROUND_ZOOM,
      0.6,
    ],
    'heatmap-color': [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0,
      'rgba(119, 208, 236, 0)',
      0.4,
      '#77d0ec',
      0.75,
      '#c7de35',
      0.95,
      '#f06053',
      1,
      '#c53f31',
    ],
    'heatmap-radius': [
      'interpolate',
      ['exponential', 2],
      ['zoom'],
      LOW_ZOOM,
      12,
      GROUND_ZOOM,
      12,
      HIGH_ZOOM,
      48,
      MAX_ZOOM,
      768,
    ],
    'heatmap-opacity': 0.7,
  }
}
