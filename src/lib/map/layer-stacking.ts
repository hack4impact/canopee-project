import type { Map as MapboxMap } from 'mapbox-gl'
import { HEATMAP_LAYER_ID } from '@/lib/heatmap/layer'
import { OBSERVATIONS_LAYER_ID } from '@/lib/observations/layer'
import { REPORT_CLUSTERS_LAYER_ID } from '@/lib/reports/pins'

/**
 * The marker layers that must always render above the heatmap.
 * REPORT_CLUSTERS_LAYER_ID is the first of the three report-pin layers
 */
const PIN_LAYER_IDS = [REPORT_CLUSTERS_LAYER_ID, OBSERVATIONS_LAYER_ID]

export function keepHeatmapBelowPins(map: MapboxMap): void {
  if (!map.getLayer(HEATMAP_LAYER_ID)) {
    return
  }

  const order = new Map(
    map.getStyle().layers.map((layer, index) => [layer.id, index]),
  )

  let lowestPinLayer: string | undefined
  let lowestIndex = Number.POSITIVE_INFINITY

  for (const id of PIN_LAYER_IDS) {
    const index = order.get(id)

    if (index !== undefined && index < lowestIndex) {
      lowestIndex = index
      lowestPinLayer = id
    }
  }

  if (
    lowestPinLayer === undefined ||
    (order.get(HEATMAP_LAYER_ID) ?? Number.POSITIVE_INFINITY) <= lowestIndex
  ) {
    return
  }

  map.moveLayer(HEATMAP_LAYER_ID, lowestPinLayer)
}
