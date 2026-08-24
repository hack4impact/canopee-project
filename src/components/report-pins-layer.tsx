'use client'

import { useEffect, useMemo, useState } from 'react'
import mapboxgl, { type GeoJSONSource } from 'mapbox-gl'
import { useSharedMap } from '@/components/map-provider'
import { ReportFilters } from '@/components/report-filters'
import {
  REPORT_CATEGORY_LABELS,
  REPORT_GROUPS,
  type ReportGroup,
} from '@/lib/reports/categories'
import {
  allCategoriesSelected,
  selectionToParam,
  toggleCategory,
  toggleGroup,
  type CategorySelection,
} from '@/lib/reports/filters'
import { formatEventNumber } from '@/lib/reports/format'
import { reportPinSvg } from '@/lib/reports/group-style'
import {
  clusterCountLayout,
  clusterCountPaint,
  clusterPaint,
  pinImageId,
  pinLayout,
  toFeatureCollection,
  CLUSTER_MAX_ZOOM,
  CLUSTER_RADIUS_PX,
  REPORT_CLUSTER_COUNT_LAYER_ID,
  REPORT_CLUSTERS_LAYER_ID,
  REPORT_PINS_LAYER_ID,
  REPORT_PINS_SOURCE_ID,
  type ReportPin,
  type ReportPinCollection,
  type ReportPinProperties,
  type ReportStatus,
} from '@/lib/reports/pins'

const EMPTY_COLLECTION: ReportPinCollection = {
  type: 'FeatureCollection',
  features: [],
}

type PinImages = Record<ReportGroup, HTMLImageElement>

function loadPinImage(group: ReportGroup): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Unable to draw the ${group} pin`))
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      reportPinSvg(group),
    )}`
  })
}

async function loadPinImages(): Promise<PinImages> {
  const images = await Promise.all(REPORT_GROUPS.map(loadPinImage))

  return Object.fromEntries(
    REPORT_GROUPS.map((group, index) => [group, images[index]]),
  ) as PinImages
}

function prefersHover(): boolean {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

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
  const [images, setImages] = useState<PinImages | null>(null)
  const [selection, setSelection] = useState<CategorySelection>(
    allCategoriesSelected,
  )

  useEffect(() => {
    let cancelled = false

    loadPinImages()
      .then((loaded) => {
        if (!cancelled) {
          setImages(loaded)
        }
      })
      .catch((cause) => {
        if (!cancelled) {
          console.warn('Unable to draw the report pins', cause)
          setFailed(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const categoriesParam = selectionToParam(selection)

  useEffect(() => {
    if (categoriesParam === '') {
      return
    }

    let cancelled = false

    async function loadPins() {
      try {
        const suffix =
          categoriesParam === null ? '' : `&categories=${categoriesParam}`

        const response = await fetch(`/api/reports?status=${status}${suffix}`, {
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
  }, [status, categoriesParam])

  const collection = useMemo(() => {
    if (categoriesParam === '') {
      return EMPTY_COLLECTION
    }

    return pins ? toFeatureCollection(pins) : null
  }, [pins, categoriesParam])

  useEffect(() => {
    if (!map || !images) {
      return
    }

    let mapRemoved = false
    const handleRemove = () => {
      mapRemoved = true
    }

    map.on('remove', handleRemove)

    for (const group of REPORT_GROUPS) {
      if (!map.hasImage(pinImageId(group))) {
        map.addImage(pinImageId(group), images[group], { pixelRatio: 2 })
      }
    }

    map.addSource(REPORT_PINS_SOURCE_ID, {
      type: 'geojson',
      data: EMPTY_COLLECTION,
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
      type: 'symbol',
      source: REPORT_PINS_SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      layout: pinLayout(),
    })

    const hoverOpens = prefersHover()

    const popup = new mapboxgl.Popup({
      className: 'canopee-popup',
      closeButton: !hoverOpens,
      closeOnClick: !hoverOpens,
      offset: [0, -40],
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

    const showPopup = (
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

    const hidePopup = () => {
      popup.remove()
    }

    const showPointer = () => {
      map.getCanvas().style.cursor = 'pointer'
    }

    const clearPointer = () => {
      map.getCanvas().style.cursor = ''
    }

    map.on('click', REPORT_CLUSTERS_LAYER_ID, handleClusterClick)
    map.on('mouseenter', REPORT_CLUSTERS_LAYER_ID, showPointer)
    map.on('mouseleave', REPORT_CLUSTERS_LAYER_ID, clearPointer)
    map.on('mouseenter', REPORT_PINS_LAYER_ID, showPointer)
    map.on('mouseleave', REPORT_PINS_LAYER_ID, clearPointer)

    if (hoverOpens) {
      map.on('mousemove', REPORT_PINS_LAYER_ID, showPopup)
      map.on('mouseleave', REPORT_PINS_LAYER_ID, hidePopup)
    } else {
      map.on('click', REPORT_PINS_LAYER_ID, showPopup)
    }

    return () => {
      map.off('remove', handleRemove)

      if (mapRemoved) {
        return
      }

      popup.remove()

      map.off('click', REPORT_CLUSTERS_LAYER_ID, handleClusterClick)
      map.off('mouseenter', REPORT_CLUSTERS_LAYER_ID, showPointer)
      map.off('mouseleave', REPORT_CLUSTERS_LAYER_ID, clearPointer)
      map.off('mouseenter', REPORT_PINS_LAYER_ID, showPointer)
      map.off('mouseleave', REPORT_PINS_LAYER_ID, clearPointer)
      map.off('mousemove', REPORT_PINS_LAYER_ID, showPopup)
      map.off('mouseleave', REPORT_PINS_LAYER_ID, hidePopup)
      map.off('click', REPORT_PINS_LAYER_ID, showPopup)

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

      for (const group of REPORT_GROUPS) {
        if (map.hasImage(pinImageId(group))) {
          map.removeImage(pinImageId(group))
        }
      }
    }
  }, [map, images])

  useEffect(() => {
    if (!map) {
      return
    }

    const source = map.getSource(REPORT_PINS_SOURCE_ID) as
      GeoJSONSource | undefined

    source?.setData(collection ?? EMPTY_COLLECTION)
  }, [map, collection, images])

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

  return (
    <ReportFilters
      selection={selection}
      onToggleCategory={(category) =>
        setSelection((current) => toggleCategory(current, category))
      }
      onToggleGroup={(group) =>
        setSelection((current) => toggleGroup(current, group))
      }
      className="absolute top-20 left-4 z-10"
    />
  )
}
