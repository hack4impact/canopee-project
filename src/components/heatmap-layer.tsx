'use client'

import { useEffect, useRef, useState } from 'react'
import { useMapFilters } from '@/components/map-filters-provider'
import { useSharedMap } from '@/components/map-provider'
import {
  heatmapPaint,
  heatmapWeight,
  HEATMAP_LAYER_ID,
  HEATMAP_SOURCE_ID,
} from '@/lib/heatmap/layer'
import type { HeatmapCollection } from '@/lib/heatmap/zones'
import { keepHeatmapBelowPins } from '@/lib/map/layer-stacking'

type HeatmapPayload = {
  maxPoints: number
  zones: HeatmapCollection
}

const REFRESH_INTERVAL_MS = 30_000

export function HeatmapLayer() {
  const map = useSharedMap()
  const [payload, setPayload] = useState<HeatmapPayload | null>(null)
  const payloadRef = useRef<HeatmapPayload | null>(null)
  const [failed, setFailed] = useState(false)
  const { heatmapVisible, onHeatmapAvailable } = useMapFilters()

  const hasZones = payload !== null && payload.zones.features.length > 0

  useEffect(() => {
    let cancelled = false

    async function loadZones() {
      try {
        const response = await fetch('/api/heatmap', { redirect: 'manual' })

        if (!response.ok) {
          throw new Error(`Heatmap request failed (${response.status})`)
        }

        const data = (await response.json()) as HeatmapPayload

        if (!cancelled) {
          payloadRef.current = data
          setPayload(data)
          setFailed(false)
        }
      } catch (cause) {
        if (!cancelled) {
          console.warn('Unable to load the patrol heatmap', cause)
          setFailed(true)
        }
      }
    }

    void loadZones()

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadZones()
      }
    }, REFRESH_INTERVAL_MS)

    function refreshWhenVisible() {
      if (document.visibilityState === 'visible') {
        void loadZones()
      }
    }

    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [])

  useEffect(() => {
    const zones = payloadRef.current

    if (!map || !hasZones || !zones) {
      return
    }

    let mapRemoved = false
    const handleRemove = () => {
      mapRemoved = true
    }

    map.on('remove', handleRemove)
    map.addSource(HEATMAP_SOURCE_ID, { type: 'geojson', data: zones.zones })

    map.addLayer({
      id: HEATMAP_LAYER_ID,
      type: 'heatmap',
      source: HEATMAP_SOURCE_ID,
      paint: heatmapPaint(zones.maxPoints),
    })

    keepHeatmapBelowPins(map)

    return () => {
      map.off('remove', handleRemove)

      if (mapRemoved) {
        return
      }

      if (map.getLayer(HEATMAP_LAYER_ID)) {
        map.removeLayer(HEATMAP_LAYER_ID)
      }

      if (map.getSource(HEATMAP_SOURCE_ID)) {
        map.removeSource(HEATMAP_SOURCE_ID)
      }
    }
  }, [map, hasZones])

  useEffect(() => {
    if (!map || !payload) {
      return
    }

    const source = map.getSource(HEATMAP_SOURCE_ID)

    if (source && source.type === 'geojson') {
      source.setData(payload.zones)
    }

    if (map.getLayer(HEATMAP_LAYER_ID)) {
      map.setPaintProperty(
        HEATMAP_LAYER_ID,
        'heatmap-weight',
        heatmapWeight(payload.maxPoints),
      )
    }
  }, [map, payload])

  useEffect(() => {
    if (!map || !map.getLayer(HEATMAP_LAYER_ID)) {
      return
    }

    map.setLayoutProperty(
      HEATMAP_LAYER_ID,
      'visibility',
      heatmapVisible ? 'visible' : 'none',
    )
  }, [map, payload, heatmapVisible])

  useEffect(() => {
    onHeatmapAvailable(
      !failed && payload !== null && payload.zones.features.length > 0,
    )
  }, [payload, failed, onHeatmapAvailable])

  if (failed) {
    return (
      <p
        role="status"
        className="absolute bottom-28 left-1/2 z-10 -translate-x-1/2 rounded-full bg-canopee-cream/95 px-3 py-1.5 text-sm font-medium text-canopee-forest shadow-md ring-1 ring-black/5 backdrop-blur-sm"
      >
        Impossible d&apos;afficher la fréquentation des patrouilles.
      </p>
    )
  }

  return null
}
