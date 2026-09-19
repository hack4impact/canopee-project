'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { useSharedMap } from '@/components/map-provider'
import { isGeolocationAvailable } from '@/lib/mapbox'
import { distanceBetweenMetres } from '@/lib/patrols/distance'

const LOCATE_ZOOM = 16
const FOLLOW_DURATION_MS = 700
const FOLLOW_MIN_MOVE_METRES = 3
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
  /** Keep the camera on the patroller as they move; paused when they pan. */
  follow?: boolean
}

/**
 * Locates the patroller on the shared map: drops a marker at their position,
 * optionally flies the camera to them, and offers a compass button to recenter
 * on them and face north again. Used by the home, Carte and Patrouiller pages.
 */
export function UserLocation({
  compassClassName = 'absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 z-10',
  follow = true,
}: UserLocationProps) {
  const map = useSharedMap()
  const followingRef = useRef(follow)

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
    let centred = false
    let lastFixAt = 0

    function placeMarker(position: GeolocationPosition) {
      if (cancelled || position.timestamp < lastFixAt) {
        return
      }

      lastFixAt = position.timestamp

      const { longitude, latitude } = position.coords
      lastPositionRef.current = { longitude, latitude }

      if (marker) {
        marker.setLngLat([longitude, latitude])
      } else {
        marker = new mapboxgl.Marker({
          element: createUserLocationElement(),
        })
          .setLngLat([longitude, latitude])
          .addTo(targetMap)
      }

      if (!followingRef.current) {
        return
      }

      if (!centred) {
        centred = true
        targetMap.flyTo({
          center: [longitude, latitude],
          zoom: LOCATE_ZOOM,
          essential: true,
        })

        return
      }

      const centre = targetMap.getCenter()
      const moved = distanceBetweenMetres(
        { latitude: centre.lat, longitude: centre.lng },
        { latitude, longitude },
      )

      if (moved < FOLLOW_MIN_MOVE_METRES) {
        return
      }

      targetMap.easeTo({
        center: [longitude, latitude],
        duration: FOLLOW_DURATION_MS,
        essential: true,
      })
    }

    function releaseFollow(event: { originalEvent?: unknown }) {
      if (event.originalEvent) {
        followingRef.current = false
      }
    }

    targetMap.on('movestart', releaseFollow)

    navigator.geolocation.getCurrentPosition(placeMarker, () => {}, {
      enableHighAccuracy: false,
      timeout: 3_000,
      maximumAge: LOCATE_CACHE_MAX_AGE_MS,
    })

    const watchId = navigator.geolocation.watchPosition(placeMarker, () => {}, {
      enableHighAccuracy: true,
      timeout: LOCATE_TIMEOUT_MS,
      maximumAge: 0,
    })

    return () => {
      cancelled = true
      navigator.geolocation.clearWatch(watchId)
      targetMap.off('movestart', releaseFollow)
      marker?.remove()
      marker = null
    }
  }, [map])

  return (
    <CompassButton
      map={map}
      lastPositionRef={lastPositionRef}
      followingRef={followingRef}
      className={compassClassName}
    />
  )
}

/** Spins the map back north and recentres on the patroller's last fix */
function CompassButton({
  map,
  lastPositionRef,
  followingRef,
  className,
}: {
  map: mapboxgl.Map | null
  lastPositionRef: React.RefObject<{
    longitude: number
    latitude: number
  } | null>
  followingRef: React.RefObject<boolean>
  className: string
}) {
  function handleClick() {
    if (!map) {
      return
    }

    followingRef.current = true

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
      className={`${className} flex h-12 w-12 touch-manipulation items-center justify-center rounded-2xl bg-canopee-forest/80 text-canopee-cream shadow-xl shadow-black/30 ring-1 ring-white/10 backdrop-blur-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-canopee-forest focus-visible:ring-2 focus-visible:ring-canopee-lime focus-visible:outline-none active:scale-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0`}
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
