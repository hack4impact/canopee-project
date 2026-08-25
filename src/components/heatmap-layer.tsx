'use client'

import { useEffect, useState } from 'react'
import { useSharedMap } from '@/components/map-provider'
import {
  heatmapPaint,
  HEATMAP_LAYER_ID,
  HEATMAP_SOURCE_ID,
} from '@/lib/heatmap/layer'
import type { HeatmapCollection } from '@/lib/heatmap/zones'
import { keepHeatmapBelowPins } from '@/lib/map/layer-stacking'

type HeatmapPayload = {
  maxPoints: number
  zones: HeatmapCollection
}

export function HeatmapLayer() {
  const map = useSharedMap()
  const [payload, setPayload] = useState<HeatmapPayload | null>(null)
  const [failed, setFailed] = useState(false)
  const [visible, setVisible] = useState(true)

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
          setPayload(data)
        }
      } catch (cause) {
        if (!cancelled) {
          console.warn('Unable to load the patrol heatmap', cause)
          setFailed(true)
        }
      }
    }

    void loadZones()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!map || !payload || payload.zones.features.length === 0) {
      return
    }

    let mapRemoved = false
    const handleRemove = () => {
      mapRemoved = true
    }

    map.on('remove', handleRemove)
    map.addSource(HEATMAP_SOURCE_ID, { type: 'geojson', data: payload.zones })

    map.addLayer({
      id: HEATMAP_LAYER_ID,
      type: 'heatmap',
      source: HEATMAP_SOURCE_ID,
      paint: heatmapPaint(payload.maxPoints),
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
  }, [map, payload])

  useEffect(() => {
    if (!map || !map.getLayer(HEATMAP_LAYER_ID)) {
      return
    }

    map.setLayoutProperty(
      HEATMAP_LAYER_ID,
      'visibility',
      visible ? 'visible' : 'none',
    )
  }, [map, payload, visible])

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

  if (!payload || payload.zones.features.length === 0) {
    return null
  }

  return (
    <button
      type="button"
      onClick={() => setVisible((current) => !current)}
      aria-pressed={visible}
      className="absolute top-4 right-4 z-10 touch-manipulation rounded-full bg-canopee-forest/80 px-4 py-2.5 text-sm font-medium text-canopee-cream shadow-xl shadow-black/30 ring-1 ring-white/10 backdrop-blur-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-canopee-forest focus-visible:ring-2 focus-visible:ring-canopee-lime focus-visible:outline-none active:scale-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {visible ? 'Masquer la carte de chaleur' : 'Afficher la carte de chaleur'}
    </button>
  )
}
