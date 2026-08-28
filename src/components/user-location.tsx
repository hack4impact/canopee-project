'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { useSharedMap } from '@/components/map-provider'
import { isGeolocationAvailable } from '@/lib/mapbox'

const LOCATE_ZOOM = 16
const LOCATE_TIMEOUT_MS = 10_000
const LOCATE_CACHE_MAX_AGE_MS = 10_000

/**Google Maps style dot : blue circle inside a white ring with a soft shadow */
function createUserLocationElement(): HTMLDivElement {
  const element = document.createElement('div')
  element.className =
    'relative h-[18px] w-[18px] rounded-full border-[3px] border-white bg-canopee-sky-dark shadow-md ring-1 ring-canopee-forest/20'

  return element
}

type UserLocationProps = {
  /** Position of the compass button, to clear fixed headers when needed. */
  compassClassName?: string
  /** Fly the camera to the patroller on arrival; false keeps the current view. */
  flyToOnLocate?: boolean
}

/**
 * Locates the patroller on the shared map: drops a marker at their position,
 * optionally flies the camera to them, and offers a compass button to recenter
 * on them and face north again. Used by the home, Carte and Patrouiller pages.
 */
export function UserLocation({
  compassClassName = 'absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 z-10',
  flyToOnLocate = true,
}: UserLocationProps) {
  const map = useSharedMap()

  const lastPositionRef = useRef<{
    longitude: number
    latitude: number
  } | null>(null)

  // Always centres the map on the patroller and shows the position dot as
  // soon as the map loads, on every visit (including a page refresh)
  useEffect(() => {
    if (!map || !isGeolocationAvailable()) {
      return
    }

    const targetMap = map
    let cancelled = false
    let marker: mapboxgl.Marker | null = null

    function placeMarker(position: GeolocationPosition, moveCamera: boolean) {
      if (cancelled) {
        return
      }

      const { longitude, latitude } = position.coords
      lastPositionRef.current = { longitude, latitude }

      marker?.remove()
      marker = new mapboxgl.Marker({
        element: createUserLocationElement(),
      })
        .setLngLat([longitude, latitude])
        .addTo(targetMap)

      if (moveCamera && flyToOnLocate) {
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
      marker?.remove()
      marker = null
    }
  }, [map, flyToOnLocate])

  return (
    <CompassButton
      map={map}
      lastPositionRef={lastPositionRef}
      className={compassClassName}
    />
  )
}

/** Spins the map back north and recentres on the patroller's last fix */
function CompassButton({
  map,
  lastPositionRef,
  className,
}: {
  map: mapboxgl.Map | null
  lastPositionRef: React.RefObject<{
    longitude: number
    latitude: number
  } | null>
  className: string
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
      className={`${className} flex h-12 w-12 touch-manipulation items-center justify-center rounded-full bg-canopee-forest/80 text-canopee-cream shadow-xl shadow-black/30 ring-1 ring-white/10 backdrop-blur-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-canopee-forest focus-visible:ring-2 focus-visible:ring-canopee-lime focus-visible:outline-none active:scale-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0`}
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
