'use client'

import { useEffect, useState, type ReactNode } from 'react'
import type { Map as MapboxMap } from 'mapbox-gl'
import { BaseMap } from '@/components/base-map'
import {
  hasDrawableRoute,
  routeBounds,
  toLineCoordinates,
  type RoutePoint,
} from '@/lib/patrols/polyline'

const SOURCE_ID = 'patrol-route'
const LAYER_ID = 'patrol-route-line'
const LINE_COLOR = '#17aa55'
const LINE_WIDTH = 3.5
const FIT_PADDING = 48
const FIT_MAX_ZOOM = 16

type PatrolRouteMapProps = {
  patrolId: string
  accessToken?: string
  children?: ReactNode
}

function routeMessage(points: RoutePoint[] | null, failed: boolean) {
  if (failed) {
    return 'Impossible de charger le trajet de cette patrouille.'
  }

  if (!points) {
    return null
  }

  if (!hasDrawableRoute(points)) {
    return 'Cette patrouille ne contient pas assez de points GPS pour afficher un trajet.'
  }

  return null
}

export function PatrolRouteMap({
  patrolId,
  accessToken,
  children,
}: PatrolRouteMapProps) {
  const [map, setMap] = useState<MapboxMap | null>(null)
  const [points, setPoints] = useState<RoutePoint[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadRoute() {
      try {
        const response = await fetch(`/api/patrols/${patrolId}/points`, {
          redirect: 'manual',
        })

        if (!response.ok) {
          throw new Error(`Patrol route request failed (${response.status})`)
        }

        const payload = (await response.json()) as { points: RoutePoint[] }

        if (!cancelled) {
          setPoints(payload.points)
        }
      } catch (cause) {
        if (!cancelled) {
          console.warn('Unable to load the patrol route', cause)
          setFailed(true)
        }
      }
    }

    void loadRoute()

    return () => {
      cancelled = true
    }
  }, [patrolId])

  useEffect(() => {
    if (!map || !points || !hasDrawableRoute(points)) {
      return
    }

    const coordinates = toLineCoordinates(points)

    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates },
      },
    })

    map.addLayer({
      id: LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': LINE_COLOR, 'line-width': LINE_WIDTH },
    })

    const bounds = routeBounds(coordinates)

    if (bounds) {
      map.fitBounds(bounds, {
        padding: FIT_PADDING,
        maxZoom: FIT_MAX_ZOOM,
        duration: 0,
      })
    }

    return () => {
      if (map.getLayer(LAYER_ID)) {
        map.removeLayer(LAYER_ID)
      }

      if (map.getSource(SOURCE_ID)) {
        map.removeSource(SOURCE_ID)
      }
    }
  }, [map, points])

  const message = routeMessage(points, failed)

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-[min(70vh,720px)] min-h-[280px] w-full">
        <BaseMap
          accessToken={accessToken}
          onMapReady={setMap}
          className="h-full w-full overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800"
        />
        {children}
      </div>

      {message && (
        <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">
          {message}
        </p>
      )}
    </div>
  )
}
