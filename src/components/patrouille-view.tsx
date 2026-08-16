'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { BaseMap } from '@/components/base-map'
import { BottomNav } from '@/components/bottom-nav'
import { PatrolControls } from '@/components/patrol-controls'
import { isGeolocationAvailable } from '@/lib/mapbox'

const LOCATE_ZOOM = 16
const LOCATE_TIMEOUT_MS = 10_000
const LOCATE_CACHE_MAX_AGE_MS = 10_000

/**
 * The map view survives leaving the page: the last centre and zoom are saved
 * here and restored on the next visit, so a patrol map does not reset.
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

function writeStoredView(map: mapboxgl.Map): void {
  try {
    const { lng, lat } = map.getCenter()

    window.sessionStorage.setItem(
      VIEW_STORAGE_KEY,
      JSON.stringify({ longitude: lng, latitude: lat, zoom: map.getZoom() }),
    )
  } catch {}
}

type PatrouilleViewProps = {
  accessToken?: string
  patrolStartedAt?: string | null
}

export function PatrouilleView({
  accessToken,
  patrolStartedAt = null,
}: PatrouilleViewProps) {
  const [map, setMap] = useState<mapboxgl.Map | null>(null)
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)

  const lastPositionRef = useRef<{
    longitude: number
    latitude: number
  } | null>(null)

  function handleMapReady(map: mapboxgl.Map) {
    // Restores the last view as the initial camera only: the auto-locate
    // below flies to the patroller as soon as a fix arrives
    const stored = readStoredView()

    if (stored) {
      map.jumpTo({
        center: [stored.longitude, stored.latitude],
        zoom: stored.zoom,
      })
    }

    map.on('moveend', () => writeStoredView(map))
    setMap(map)
  }

  // Always centres the map on the patroller and shows the position dot as
  // soon as the map loads, on every visit (including a page refresh)
  useEffect(() => {
    if (!map || !isGeolocationAvailable()) {
      return
    }

    const targetMap = map
    let cancelled = false

    function placeMarker(position: GeolocationPosition, moveCamera: boolean) {
      if (cancelled) {
        return
      }

      const { longitude, latitude } = position.coords
      lastPositionRef.current = { longitude, latitude }

      userMarkerRef.current?.remove()
      userMarkerRef.current = new mapboxgl.Marker({
        element: createUserLocationElement(),
      })
        .setLngLat([longitude, latitude])
        .addTo(targetMap)

      if (moveCamera) {
        targetMap.flyTo({
          center: [longitude, latitude],
          zoom: LOCATE_ZOOM,
          essential: true,
        })
      }
    }

    navigator.geolocation.getCurrentPosition(
      (position) => placeMarker(position, true),
      () => {},
      {
        enableHighAccuracy: false,
        timeout: 3_000,
        maximumAge: LOCATE_CACHE_MAX_AGE_MS,
      },
    )

    navigator.geolocation.getCurrentPosition(
      (position) => placeMarker(position, false),
      () => {},
      {
        enableHighAccuracy: true,
        timeout: LOCATE_TIMEOUT_MS,
        maximumAge: 0,
      },
    )

    return () => {
      cancelled = true
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
    }
  }, [map])

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden">
      <BaseMap
        accessToken={accessToken}
        onMapReady={handleMapReady}
        className="h-dvh w-full"
      />

      <CompassButton map={map} lastPositionRef={lastPositionRef} />

      <PatrolControls startedAt={patrolStartedAt} />

      <BottomNav />
    </div>
  )
}

/**Google Maps style dot : blue circle inside a white ring with a soft shadow */
function createUserLocationElement(): HTMLDivElement {
  const element = document.createElement('div')
  element.className =
    'relative h-[18px] w-[18px] rounded-full border-[3px] border-white bg-canopee-lime shadow-md ring-1 ring-canopee-green/10'

  return element
}

/** Spins the map back north and recentres on the patroller's last fix */
function CompassButton({
  map,
  lastPositionRef,
}: {
  map: mapboxgl.Map | null
  lastPositionRef: React.RefObject<{
    longitude: number
    latitude: number
  } | null>
}) {
  function handleClick() {
    if (!map) {
      return
    }

    const lastPosition = lastPositionRef.current

    if (lastPosition) {
      map.easeTo({
        center: [lastPosition.longitude, lastPosition.latitude],
        bearing: 0,
        essential: true,
      })
    } else {
      map.easeTo({ bearing: 0, essential: true })
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Ramener le nord en haut de l'écran"
      className="absolute top-4 right-4 z-10 flex h-12 w-12 touch-manipulation items-center justify-center rounded-full bg-canopee-forest/80 text-canopee-cream shadow-xl shadow-black/30 ring-1 ring-white/10 backdrop-blur-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-canopee-forest focus-visible:ring-2 focus-visible:ring-canopee-lime focus-visible:outline-none active:scale-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <CompassIcon className="h-6 w-6" />
    </button>
  )
}

function CompassIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z" />
    </svg>
  )
}
