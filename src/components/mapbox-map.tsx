'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import {
  LAVAL_WOODED_VIEW,
  MAPBOX_OUTDOORS_STYLE,
  type MapViewport,
} from '@/lib/mapbox/config'

type MapboxMapProps = {
  accessToken?: string
  className?: string
  viewport?: MapViewport
}

export function MapboxMap({
  accessToken,
  className,
  viewport = LAVAL_WOODED_VIEW,
}: MapboxMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const mapboxToken = accessToken ?? process.env.NEXT_PUBLIC_MAPBOX_TOKEN

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
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')

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
        setError(
          'Les tuiles Mapbox sont bloquées. Dans le tableau de bord Mapbox, vérifiez que le token a le scope STYLES:TILES et que les URL autorisées incluent http://localhost:3000/*.',
        )
      }
    })

    return () => {
      map.remove()
      setIsReady(false)
    }
  }, [mapboxToken, viewport.latitude, viewport.longitude, viewport.zoom])

  if (!mapboxToken) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400 ${className ?? ''}`}
      >
        Ajoutez <code className="mx-1 font-mono">NEXT_PUBLIC_MAPBOX_TOKEN</code>{' '}
        à votre fichier <code className="mx-1 font-mono">.env</code> ou{' '}
        <code className="mx-1 font-mono">.env.local</code>, puis redémarrez le
        serveur de développement.
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300 ${className ?? ''}`}
      >
        {error}
      </div>
    )
  }

  return (
    <div className={`relative ${className ?? ''}`}>
      <div
        ref={containerRef}
        className="mapbox-map h-full w-full"
        role="region"
        aria-label="Carte Mapbox"
      />
      {!isReady && (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          Chargement de la carte…
        </p>
      )}
    </div>
  )
}
