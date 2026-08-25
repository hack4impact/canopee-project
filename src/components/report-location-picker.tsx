'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { BaseMap } from '@/components/base-map'
import { clampToLavalBounds, type ReportPosition } from '@/lib/reports/location'

const PIN_ZOOM = 17

const PIN_COLOR = '#c53f31'

type ReportLocationPickerProps = {
  position: ReportPosition | null
  onPositionChange: (position: ReportPosition) => void
  disabled?: boolean
  className?: string
}

export function ReportLocationPicker({
  position,
  onPositionChange,
  disabled = false,
  className,
}: ReportLocationPickerProps) {
  const [map, setMap] = useState<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const hasCenteredRef = useRef(false)
  const onPositionChangeRef = useRef(onPositionChange)

  useEffect(() => {
    onPositionChangeRef.current = onPositionChange
  }, [onPositionChange])

  const handleMapReady = useCallback((instance: mapboxgl.Map) => {
    setMap(instance)
  }, [])

  useEffect(() => {
    if (!map || !position) {
      return
    }

    const marker = markerRef.current

    if (marker) {
      marker.setLngLat([position.longitude, position.latitude])
    } else {
      const created = new mapboxgl.Marker({
        color: PIN_COLOR,
        draggable: !disabled,
      })
        .setLngLat([position.longitude, position.latitude])
        .addTo(map)

      created.on('dragend', () => {
        const lngLat = created.getLngLat()

        onPositionChangeRef.current(
          clampToLavalBounds({
            latitude: lngLat.lat,
            longitude: lngLat.lng,
          }),
        )
      })

      markerRef.current = created
    }

    const center: [number, number] = [position.longitude, position.latitude]

    if (!hasCenteredRef.current) {
      hasCenteredRef.current = true
      map.flyTo({ center, zoom: PIN_ZOOM, essential: true })
    } else if (!map.getBounds()?.contains(center)) {
      map.easeTo({ center, essential: true })
    }
  }, [map, position, disabled])

  useEffect(() => {
    markerRef.current?.setDraggable(!disabled)
  }, [disabled])

  useEffect(() => {
    if (!map || disabled) {
      return
    }

    const handleClick = (event: mapboxgl.MapMouseEvent) => {
      onPositionChangeRef.current(
        clampToLavalBounds({
          latitude: event.lngLat.lat,
          longitude: event.lngLat.lng,
        }),
      )
    }

    map.on('click', handleClick)

    return () => {
      map.off('click', handleClick)
    }
  }, [map, disabled])

  useEffect(() => {
    if (!map) {
      return
    }

    return () => {
      markerRef.current?.remove()
      markerRef.current = null
    }
  }, [map])

  return (
    <BaseMap
      className={`h-40 w-full overflow-hidden rounded-lg border border-canopee-green/30 sm:h-56 ${className ?? ''}`}
      mapClassName={disabled ? 'touch-none opacity-60' : 'touch-none'}
      ariaLabel="Carte pour situer le signalement. Touchez la carte ou faites glisser le repère pour ajuster la position."
      onMapReady={handleMapReady}
    />
  )
}
