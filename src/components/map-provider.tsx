'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Map as MapboxMap } from 'mapbox-gl'
import { BaseMap } from '@/components/base-map'
import { WoodedAreasLayer } from '@/components/wooded-areas-layer'

/**
 * The camera survives a page reload: the last centre and zoom are saved here
 * and restored when the map is created, so the view does not reset.
 */
const VIEW_STORAGE_KEY = 'canopee-patrol-view'

type StoredView = {
  longitude: number
  latitude: number
  zoom: number
}

function readStoredView(): StoredView | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.sessionStorage.getItem(VIEW_STORAGE_KEY)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<StoredView>

    if (
      typeof parsed.longitude === 'number' &&
      typeof parsed.latitude === 'number' &&
      typeof parsed.zoom === 'number'
    ) {
      return {
        longitude: parsed.longitude,
        latitude: parsed.latitude,
        zoom: parsed.zoom,
      }
    }
  } catch {}

  return null
}

function writeStoredView(map: MapboxMap): void {
  try {
    const { lng, lat } = map.getCenter()

    window.sessionStorage.setItem(
      VIEW_STORAGE_KEY,
      JSON.stringify({ longitude: lng, latitude: lat, zoom: map.getZoom() }),
    )
  } catch {}
}

const MapContext = createContext<MapboxMap | null>(null)

/** The map owned by the layout, or null until its style has finished loading. */
export function useSharedMap(): MapboxMap | null {
  return useContext(MapContext)
}

type MapProviderProps = {
  accessToken?: string
  children: ReactNode
}

export function MapProvider({ accessToken, children }: MapProviderProps) {
  const [map, setMap] = useState<MapboxMap | null>(null)

  function handleMapReady(instance: MapboxMap) {
    const stored = readStoredView()

    if (stored) {
      instance.jumpTo({
        center: [stored.longitude, stored.latitude],
        zoom: stored.zoom,
      })
    }

    instance.on('moveend', () => writeStoredView(instance))
    setMap(instance)
  }

  return (
    <div className="fixed inset-0 flex w-full flex-col overflow-hidden bg-canopee-cream">
      <BaseMap
        accessToken={accessToken}
        onMapReady={handleMapReady}
        className="h-full w-full"
      />

      <MapContext value={map}>
        <WoodedAreasLayer />
        {children}
      </MapContext>
    </div>
  )
}
