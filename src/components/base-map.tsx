'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import {
  LAVAL_WOODED_VIEW,
  LAVAL_BOUNDS,
  LAVAL_MIN_ZOOM,
  MAPBOX_OUTDOORS_STYLE,
  trackMapLoad,
  type MapViewport,
} from '@/lib/mapbox'

type BaseMapProps = {
  accessToken?: string
  className?: string
  mapClassName?: string
  ariaLabel?: string
  viewport?: MapViewport
  onMapReady?: (map: mapboxgl.Map) => void
}

/**
 * Hides the POI label layer (restaurants, shops, businesses…) so the map only
 * keeps meaningful names: roads, wooded areas and other landuse labels. In the
 * Mapbox v12 styles the business names live in the `poi_label` source layer;
 * road and landuse names come from other source layers and stay untouched.
 */
function hidePoiLabels(map: mapboxgl.Map): void {
  const style = map.getStyle()

  if (!style) {
    return
  }

  for (const layer of style.layers) {
    if (layer.type !== 'symbol') {
      continue
    }

    const sourceLayer = (layer as { 'source-layer'?: string })['source-layer']

    // Business names (restaurants, shops…) come from the `poi_label` source
    // layer (layer id `poi-label`); road, landuse and natural labels use other
    // source layers and stay visible.
    if (sourceLayer !== 'poi_label') {
      continue
    }

    if (map.getLayoutProperty(layer.id, 'visibility') !== 'none') {
      map.setLayoutProperty(layer.id, 'visibility', 'none')
    }
  }
}

export function BaseMap({
  accessToken,
  className,
  mapClassName = 'touch-pan-y',
  ariaLabel = 'Carte interactive de Laval',
  viewport = LAVAL_WOODED_VIEW,
  onMapReady,
}: BaseMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const onMapReadyRef = useRef(onMapReady)
  const [fatalError, setFatalError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const mapboxToken = accessToken ?? process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  useEffect(() => {
    onMapReadyRef.current = onMapReady
  }, [onMapReady])

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
      minZoom: LAVAL_MIN_ZOOM,
      maxBounds: LAVAL_BOUNDS,
      dragPan: true,
      touchZoomRotate: true,
      touchPitch: true,
    })

    mapRef.current = map

    const computeBoundsFloor = (): number => {
      const bounds = map.getMaxBounds()

      if (!bounds) {
        return LAVAL_MIN_ZOOM
      }

      const southWest = bounds.getSouthWest()
      const northEast = bounds.getNorthEast()
      const southWestWorld = mapboxgl.MercatorCoordinate.fromLngLat(southWest)
      const northEastWorld = mapboxgl.MercatorCoordinate.fromLngLat(northEast)

      // Bounds size in pixels at zoom 0, where the world is 512 px wide.
      const boundsWorldWidth = (northEastWorld.x - southWestWorld.x) * 512
      const boundsWorldHeight = (southWestWorld.y - northEastWorld.y) * 512

      const { clientWidth: width, clientHeight: height } = map.getContainer()

      return Math.max(
        LAVAL_MIN_ZOOM,
        Math.log2(width / boundsWorldWidth),
        Math.log2(height / boundsWorldHeight),
      )
    }

    const syncZoomFloor = () => {
      const floor = computeBoundsFloor()

      if (map.getMinZoom() !== floor) {
        map.setMinZoom(floor)
      }

      // Normalise any float drift so the camera sits exactly on the floor.
      if (map.getZoom() < floor) {
        map.setZoom(floor)
      }
    }

    syncZoomFloor()
    map.on('resize', syncZoomFloor)

    // Hide business names as soon as the style is ready (and again if it
    // reloads, e.g. after the style finishes applying).
    const handleStyleData = () => hidePoiLabels(map)
    map.on('load', handleStyleData)
    map.on('styledata', handleStyleData)

    let hasTrackedLoad = false
    let hasNotifiedReady = false
    const handleReady = () => {
      map.resize()
      syncZoomFloor()
      setIsReady(true)

      if (!hasTrackedLoad) {
        hasTrackedLoad = true
        trackMapLoad()
      }

      if (!hasNotifiedReady) {
        hasNotifiedReady = true
        onMapReadyRef.current?.(map)
      }
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
        className={`mapbox-map h-full w-full ${mapClassName}`}
        role="region"
        aria-label={ariaLabel}
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
    </div>
  )
}
