'use client'

import { useEffect, useState } from 'react'
import type { Map as MapboxMap } from 'mapbox-gl'
import { BaseMap } from '@/components/base-map'
import {
  heatmapPaint,
  HEATMAP_LAYER_ID,
  HEATMAP_SOURCE_ID,
} from '@/lib/heatmap/layer'
import type { HeatmapCollection } from '@/lib/heatmap/zones'

type HeatmapPayload = {
  maxPoints: number
  zones: HeatmapCollection
}

type HeatmapMapProps = {
  accessToken?: string
  className?: string
  visible?: boolean
}

export function HeatmapMap({
  accessToken,
  className,
  visible = true,
}: HeatmapMapProps) {
  const [map, setMap] = useState<MapboxMap | null>(null)
  const [payload, setPayload] = useState<HeatmapPayload | null>(null)
  const [failed, setFailed] = useState(false)

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

    map.addSource(HEATMAP_SOURCE_ID, { type: 'geojson', data: payload.zones })

    map.addLayer({
      id: HEATMAP_LAYER_ID,
      type: 'heatmap',
      source: HEATMAP_SOURCE_ID,
      layout: { visibility: visible ? 'visible' : 'none' },
      paint: heatmapPaint(payload.maxPoints),
    })

    return () => {
      if (map.getLayer(HEATMAP_LAYER_ID)) {
        map.removeLayer(HEATMAP_LAYER_ID)
      }

      if (map.getSource(HEATMAP_SOURCE_ID)) {
        map.removeSource(HEATMAP_SOURCE_ID)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, [map, visible])

  return (
    <>
      <BaseMap
        accessToken={accessToken}
        className={className}
        onMapReady={setMap}
      />

      {failed && (
        <p
          role="status"
          className="absolute right-2 bottom-2 left-2 z-10 rounded-lg bg-white/95 px-3 py-2 text-sm text-zinc-700 shadow-sm sm:right-auto sm:left-4 sm:max-w-sm"
        >
          Impossible d&apos;afficher la fréquentation des patrouilles.
        </p>
      )}
    </>
  )
}
