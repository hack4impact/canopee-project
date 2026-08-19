'use client'

import { useEffect, useState } from 'react'
import { useSharedMap } from '@/components/map-provider'
import type { ObservationCollection } from '@/lib/observations/collection'
import {
  observationsPaint,
  OBSERVATIONS_LAYER_ID,
  OBSERVATIONS_SOURCE_ID,
} from '@/lib/observations/layer'

type ObservationsPayload = {
  observations: ObservationCollection
}

export function ObservationsLayer() {
  const map = useSharedMap()
  const [payload, setPayload] = useState<ObservationsPayload | null>(null)
  const [failed, setFailed] = useState(false)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadObservations() {
      try {
        const response = await fetch('/api/observations', {
          redirect: 'manual',
        })

        if (!response.ok) {
          throw new Error(`Observations request failed (${response.status})`)
        }

        const data = (await response.json()) as ObservationsPayload

        if (!cancelled) {
          setPayload(data)
        }
      } catch (cause) {
        if (!cancelled) {
          console.warn('Unable to load the fauna and flora layer', cause)
          setFailed(true)
        }
      }
    }

    void loadObservations()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!map || !payload || payload.observations.features.length === 0) {
      return
    }

    let mapRemoved = false
    const handleRemove = () => {
      mapRemoved = true
    }

    map.on('remove', handleRemove)
    map.addSource(OBSERVATIONS_SOURCE_ID, {
      type: 'geojson',
      data: payload.observations,
    })

    map.addLayer({
      id: OBSERVATIONS_LAYER_ID,
      type: 'circle',
      source: OBSERVATIONS_SOURCE_ID,
      paint: observationsPaint(),
    })

    return () => {
      map.off('remove', handleRemove)

      if (mapRemoved) {
        return
      }

      if (map.getLayer(OBSERVATIONS_LAYER_ID)) {
        map.removeLayer(OBSERVATIONS_LAYER_ID)
      }

      if (map.getSource(OBSERVATIONS_SOURCE_ID)) {
        map.removeSource(OBSERVATIONS_SOURCE_ID)
      }
    }
  }, [map, payload])

  useEffect(() => {
    if (!map || !map.getLayer(OBSERVATIONS_LAYER_ID)) {
      return
    }

    map.setLayoutProperty(
      OBSERVATIONS_LAYER_ID,
      'visibility',
      visible ? 'visible' : 'none',
    )
  }, [map, payload, visible])

  if (failed) {
    return (
      <p
        role="status"
        className="absolute bottom-40 left-1/2 z-10 -translate-x-1/2 rounded-full bg-canopee-cream/95 px-3 py-1.5 text-sm font-medium text-canopee-forest shadow-md ring-1 ring-black/5 backdrop-blur-sm"
      >
        Impossible d&apos;afficher les observations de faune et de flore.
      </p>
    )
  }

  if (!payload || payload.observations.features.length === 0) {
    return null
  }

  return (
    <button
      type="button"
      onClick={() => setVisible((current) => !current)}
      aria-pressed={visible}
      className="absolute top-20 right-4 z-10 touch-manipulation rounded-full bg-canopee-forest/80 px-4 py-2.5 text-sm font-medium text-canopee-cream shadow-xl shadow-black/30 ring-1 ring-white/10 backdrop-blur-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-canopee-forest focus-visible:ring-2 focus-visible:ring-canopee-lime focus-visible:outline-none active:scale-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {visible
        ? 'Masquer la faune et la flore'
        : 'Afficher la faune et la flore'}
    </button>
  )
}
