'use client'

import { useEffect, useMemo, useState } from 'react'
import mapboxgl, { type GeoJSONSource } from 'mapbox-gl'
import { useSharedMap } from '@/components/map-provider'
import { REPORT_CATEGORY_LABELS } from '@/lib/reports/categories'
import { formatEventNumber } from '@/lib/reports/format'
import {
  clusterCountLayout,
  clusterCountPaint,
  clusterPaint,
  pinPaint,
  toFeatureCollection,
  CLUSTER_MAX_ZOOM,
  CLUSTER_RADIUS_PX,
  REPORT_CLUSTER_COUNT_LAYER_ID,
  REPORT_CLUSTERS_LAYER_ID,
  REPORT_PINS_LAYER_ID,
  REPORT_PINS_SOURCE_ID,
  type ReportPin,
  type ReportPinProperties,
  type ReportStatus,
} from '@/lib/reports/pins'

type ReportPinsPayload = {
  status: ReportStatus
  reports: ReportPin[]
}

function popupContent(properties: ReportPinProperties): HTMLElement {
  const root = document.createElement('div')
  root.className = 'flex flex-col gap-1'

  const category = document.createElement('p')
  category.className = 'font-heading text-sm text-canopee-forest'
  category.textContent =
    REPORT_CATEGORY_LABELS[properties.category] ?? properties.category

  const eventNumber = document.createElement('p')
  eventNumber.className = 'text-xs font-medium text-canopee-forest/70'
  eventNumber.textContent = formatEventNumber(Number(properties.eventNumber))

  root.append(category, eventNumber)

  return root
}

export function ReportPinsLayer({
  status = 'open',
}: {
  status?: ReportStatus
}) {
  const map = useSharedMap()
  const [pins, setPins] = useState<ReportPin[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadPins() {
      try {
        const response = await fetch(`/api/reports?status=${status}`, {
          redirect: 'manual',
        })

        if (!response.ok) {
          throw new Error(`Reports request failed (${response.status})`)
        }

        const data = (await response.json()) as ReportPinsPayload

        if (!cancelled) {
          setPins(data.reports)
        }
      } catch (cause) {
        if (!cancelled) {
          console.warn('Unable to load the report pins', cause)
          setFailed(true)
        }
      }
    }

    void loadPins()

    return () => {
      cancelled = true
    }
  }, [status])

  const collection = useMemo(
    () => (pins ? toFeatureCollection(pins) : null),
    [pins],
  )

  useEffect(() => {
    if (!map || !collection || collection.features.length === 0) {
      return
    }

    let mapRemoved = false
    const handleRemove = () => {
      mapRemoved = true
    }

    map.on('remove', handleRemove)

    map.addSource(REPORT_PINS_SOURCE_ID, {
      type: 'geojson',
      data: collection,
      cluster: true,
      clusterRadius: CLUSTER_RADIUS_PX,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
    })

    map.addLayer({
      id: REPORT_CLUSTERS_LAYER_ID,
      type: 'circle',
      source: REPORT_PINS_SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: clusterPaint(),
    })

    map.addLayer({
      id: REPORT_CLUSTER_COUNT_LAYER_ID,
      type: 'symbol',
      source: REPORT_PINS_SOURCE_ID,
      filter: ['has', 'point_count'],
      layout: clusterCountLayout(),
      paint: clusterCountPaint(),
    })

    map.addLayer({
      id: REPORT_PINS_LAYER_ID,
      type: 'circle',
      source: REPORT_PINS_SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      paint: pinPaint(),
    })

    const popup = new mapboxgl.Popup({
      className: 'canopee-popup',
      closeButton: true,
      closeOnClick: true,
      offset: 14,
      maxWidth: '260px',
    })

    const handleClusterClick = (
      event: mapboxgl.MapMouseEvent & {
        features?: mapboxgl.MapboxGeoJSONFeature[]
      },
    ) => {
      const feature = event.features?.[0]
      const clusterId = feature?.properties?.cluster_id

      if (!feature || typeof clusterId !== 'number') {
        return
      }

      const source = map.getSource(REPORT_PINS_SOURCE_ID) as
        GeoJSONSource | undefined

      source?.getClusterExpansionZoom(clusterId, (error, zoom) => {
        if (error || zoom === null || zoom === undefined) {
          return
        }

        if (feature.geometry.type !== 'Point') {
          return
        }

        map.easeTo({
          center: feature.geometry.coordinates as [number, number],
          zoom,
        })
      })
    }

    const handlePinClick = (
      event: mapboxgl.MapMouseEvent & {
        features?: mapboxgl.MapboxGeoJSONFeature[]
      },
    ) => {
      const feature = event.features?.[0]

      if (!feature || feature.geometry.type !== 'Point') {
        return
      }

      popup
        .setLngLat(feature.geometry.coordinates as [number, number])
        .setDOMContent(
          popupContent(feature.properties as unknown as ReportPinProperties),
        )
        .addTo(map)
    }

    const showPointer = () => {
      map.getCanvas().style.cursor = 'pointer'
    }

    const clearPointer = () => {
      map.getCanvas().style.cursor = ''
    }

    map.on('click', REPORT_CLUSTERS_LAYER_ID, handleClusterClick)
    map.on('click', REPORT_PINS_LAYER_ID, handlePinClick)
    map.on('mouseenter', REPORT_CLUSTERS_LAYER_ID, showPointer)
    map.on('mouseleave', REPORT_CLUSTERS_LAYER_ID, clearPointer)
    map.on('mouseenter', REPORT_PINS_LAYER_ID, showPointer)
    map.on('mouseleave', REPORT_PINS_LAYER_ID, clearPointer)

    return () => {
      map.off('remove', handleRemove)

      if (mapRemoved) {
        return
      }

      popup.remove()

      map.off('click', REPORT_CLUSTERS_LAYER_ID, handleClusterClick)
      map.off('click', REPORT_PINS_LAYER_ID, handlePinClick)
      map.off('mouseenter', REPORT_CLUSTERS_LAYER_ID, showPointer)
      map.off('mouseleave', REPORT_CLUSTERS_LAYER_ID, clearPointer)
      map.off('mouseenter', REPORT_PINS_LAYER_ID, showPointer)
      map.off('mouseleave', REPORT_PINS_LAYER_ID, clearPointer)

      for (const layerId of [
        REPORT_PINS_LAYER_ID,
        REPORT_CLUSTER_COUNT_LAYER_ID,
        REPORT_CLUSTERS_LAYER_ID,
      ]) {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId)
        }
      }

      if (map.getSource(REPORT_PINS_SOURCE_ID)) {
        map.removeSource(REPORT_PINS_SOURCE_ID)
      }
    }
  }, [map, collection])

  if (failed) {
    return (
      <p
        role="status"
        className="absolute bottom-52 left-1/2 z-10 -translate-x-1/2 rounded-full bg-canopee-cream/95 px-3 py-1.5 text-sm font-medium text-canopee-forest shadow-md ring-1 ring-black/5 backdrop-blur-sm"
      >
        Impossible d&apos;afficher les signalements.
      </p>
    )
  }

  return null
}
