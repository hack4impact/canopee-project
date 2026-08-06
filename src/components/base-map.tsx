'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import {
  getGeolocationNotice,
  isGeolocationAvailable,
  LAVAL_WOODED_VIEW,
  MAPBOX_OUTDOORS_STYLE,
  type MapViewport,
} from '@/lib/mapbox'

type BaseMapProps = {
  accessToken?: string
  className?: string
  viewport?: MapViewport
}

const LOCATE_ZOOM = 14

export function BaseMap({
  accessToken,
  className,
  viewport = LAVAL_WOODED_VIEW,
}: BaseMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const [fatalError, setFatalError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const mapboxToken = accessToken ?? process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  const resetToDefaultView = useCallback(() => {
    const map = mapRef.current
    if (!map) {
      return
    }

    map.flyTo({
      center: [viewport.longitude, viewport.latitude],
      zoom: viewport.zoom,
      essential: true,
    })
  }, [viewport.latitude, viewport.longitude, viewport.zoom])

  const handleLocate = useCallback(() => {
    const map = mapRef.current

    if (!map) {
      return
    }

    setNotice(null)

    if (!isGeolocationAvailable()) {
      setNotice(
        'La géolocalisation n’est pas disponible dans ce navigateur. La carte reste centrée sur Laval.',
      )
      resetToDefaultView()
      return
    }

    setIsLocating(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords

        userMarkerRef.current?.remove()
        userMarkerRef.current = new mapboxgl.Marker({ color: '#2563eb' })
          .setLngLat([longitude, latitude])
          .addTo(map)

        map.flyTo({
          center: [longitude, latitude],
          zoom: LOCATE_ZOOM,
          essential: true,
        })

        setIsLocating(false)
      },
      (error) => {
        setNotice(getGeolocationNotice(error).message)
        resetToDefaultView()
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    )
  }, [resetToDefaultView])

  useEffect(() => {
    const container = containerRef.current

    if (!mapboxToken || !container) {
      return
    }

    mapboxgl.accessToken = mapboxToken

    const map = new mapboxgl.Map({
      container,
      style: MAPBOX_OUTDOORS_STYLE,
      center: [viewport.longitude, viewport.latitude],
      zoom: viewport.zoom,
      dragPan: true,
      touchZoomRotate: true,
      touchPitch: true,
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    mapRef.current = map

    const handleReady = () => {
      map.resize()
      setIsReady(true)
    }

    map.once('load', handleReady)
    map.once('idle', handleReady)

    map.on('error', (event) => {
      const message = event.error?.message ?? ''

      if (
        message.includes('401') ||
        message.includes('403') ||
        message.toLowerCase().includes('forbidden') ||
        message.toLowerCase().includes('unauthorized')
      ) {
        setFatalError(
          'Les tuiles Mapbox sont bloquées. Vérifiez le scope STYLES:TILES et les URL autorisées (http://localhost:3000/*).',
        )
      }
    })

    const handleResize = () => {
      map.resize()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
      map.remove()
      mapRef.current = null
      setIsReady(false)
    }
  }, [mapboxToken, viewport.latitude, viewport.longitude, viewport.zoom])

  if (!mapboxToken) {
    return (
      <div
        className={`flex min-h-[280px] items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400 ${className ?? ''}`}
      >
        Ajoutez <code className="mx-1 font-mono">NEXT_PUBLIC_MAPBOX_TOKEN</code>{' '}
        à votre fichier <code className="mx-1 font-mono">.env.local</code>.
      </div>
    )
  }

  if (fatalError) {
    return (
      <div
        className={`flex min-h-[280px] items-center justify-center rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300 ${className ?? ''}`}
      >
        {fatalError}
      </div>
    )
  }

  return (
    <div className={`relative ${className ?? ''}`}>
      <div
        ref={containerRef}
        className="mapbox-map h-full w-full touch-pan-y"
        role="region"
        aria-label="Carte interactive de Laval"
      />

      {!isReady && (
        <div
          aria-live="polite"
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700 dark:border-zinc-700 dark:border-t-zinc-300" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Chargement de la carte…
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleLocate}
        disabled={!isReady || isLocating}
        aria-label="Me localiser"
        className="absolute top-[6.75rem] right-[10px] z-10 rounded border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      >
        {isLocating ? 'Localisation…' : 'Me localiser'}
      </button>

      {notice && (
        <p
          aria-live="polite"
          className="absolute right-2 bottom-2 left-2 z-10 rounded-lg border border-zinc-200 bg-white/95 px-3 py-2 text-sm text-zinc-700 shadow-sm sm:right-4 sm:bottom-4 sm:left-auto sm:max-w-sm dark:border-zinc-700 dark:bg-zinc-950/95 dark:text-zinc-300"
        >
          {notice}
        </p>
      )}
    </div>
  )
}
