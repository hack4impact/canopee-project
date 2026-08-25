import { describe, expect, it } from 'vitest'
import type { Map as MapboxMap } from 'mapbox-gl'
import { HEATMAP_LAYER_ID } from '@/lib/heatmap/layer'
import { OBSERVATIONS_LAYER_ID } from '@/lib/observations/layer'
import { REPORT_CLUSTERS_LAYER_ID } from '@/lib/reports/pins'
import { keepHeatmapBelowPins } from './layer-stacking'

type FakeMap = {
  layers: string[]
  moved: { id: string; beforeId?: string }[]
  getLayer: (id: string) => unknown
  getStyle: () => { layers: { id: string }[] }
  moveLayer: (id: string, beforeId?: string) => void
}

function fakeMap(initialLayers: string[]): FakeMap {
  const layers = [...initialLayers]
  const moved: FakeMap['moved'] = []

  return {
    layers,
    moved,
    getLayer: (id) => (layers.includes(id) ? { id } : undefined),
    getStyle: () => ({ layers: layers.map((id) => ({ id })) }),
    moveLayer: (id, beforeId) => {
      moved.push({ id, beforeId })
      layers.splice(layers.indexOf(id), 1)
      layers.splice(
        beforeId === undefined ? layers.length : layers.indexOf(beforeId),
        0,
        id,
      )
    },
  }
}

describe('keepHeatmapBelowPins', () => {
  it('moves the heatmap under the lowest pin layer when it was added on top', () => {
    const map = fakeMap([
      OBSERVATIONS_LAYER_ID,
      REPORT_CLUSTERS_LAYER_ID,
      HEATMAP_LAYER_ID,
    ])

    keepHeatmapBelowPins(map as unknown as MapboxMap)

    expect(map.moved).toEqual([
      { id: HEATMAP_LAYER_ID, beforeId: OBSERVATIONS_LAYER_ID },
    ])
    expect(map.layers).toEqual([
      HEATMAP_LAYER_ID,
      OBSERVATIONS_LAYER_ID,
      REPORT_CLUSTERS_LAYER_ID,
    ])
  })

  it('moves the heatmap under the fauna/flore pins when those are the only pins', () => {
    const map = fakeMap([OBSERVATIONS_LAYER_ID, HEATMAP_LAYER_ID])

    keepHeatmapBelowPins(map as unknown as MapboxMap)

    expect(map.moved).toEqual([
      { id: HEATMAP_LAYER_ID, beforeId: OBSERVATIONS_LAYER_ID },
    ])
  })

  it('leaves the heatmap untouched when it already sits below every pin layer', () => {
    const map = fakeMap([
      HEATMAP_LAYER_ID,
      OBSERVATIONS_LAYER_ID,
      REPORT_CLUSTERS_LAYER_ID,
    ])

    keepHeatmapBelowPins(map as unknown as MapboxMap)

    expect(map.moved).toEqual([])
  })

  it('does nothing when the heatmap layer is missing', () => {
    const map = fakeMap([OBSERVATIONS_LAYER_ID])

    keepHeatmapBelowPins(map as unknown as MapboxMap)

    expect(map.moved).toEqual([])
  })

  it('does nothing when no pin layer is on the map yet', () => {
    const map = fakeMap([HEATMAP_LAYER_ID])

    keepHeatmapBelowPins(map as unknown as MapboxMap)

    expect(map.moved).toEqual([])
  })
})
