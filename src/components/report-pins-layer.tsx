'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import mapboxgl, { type GeoJSONSource } from 'mapbox-gl'
import { useRouter } from 'next/navigation'
import { useMapFilters } from '@/components/map-filters-provider'
import { useSharedMap } from '@/components/map-provider'
import { ReportFilters } from '@/components/report-filters'
import {
  REPORT_CATEGORY_LABELS,
  REPORT_GROUP_LABELS,
  REPORT_GROUPS,
  type ReportGroup,
} from '@/lib/reports/categories'
import { selectionToParam } from '@/lib/reports/filters'
import { formatEventNumber, formatPinDate } from '@/lib/reports/format'
import {
  reportPinSvg,
  REPORT_GROUP_COLORS,
  REPORT_GROUP_ICON_PATHS,
} from '@/lib/reports/group-style'
import {
  clusterCountLayout,
  clusterCountPaint,
  clusterPaint,
  pinImageId,
  pinLayout,
  pinPaint,
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

const SVG_NS = 'http://www.w3.org/2000/svg'

const CHECK_PATH = 'M20 6 9 17l-5-5'

function iconSvg(paths: readonly string[], className: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg')

  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '2.4')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('class', className)

  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, 'path')

    path.setAttribute('d', d)
    svg.append(path)
  }

  return svg
}

function statusBadge(resolved: boolean): HTMLElement {
  const badge = document.createElement('span')

  badge.className =
    'ml-auto inline-flex items-center gap-1.5 rounded bg-white/25 px-1.5 py-0.5 text-[11px] font-bold'

  if (resolved) {
    badge.append(
      iconSvg([CHECK_PATH], 'size-3 shrink-0'),
      document.createTextNode('Résolu'),
    )

    return badge
  }

  badge.append(document.createTextNode('Ouvert'))

  return badge
}

async function fillPhoto(frame: HTMLElement, id: string): Promise<void> {
  try {
    const response = await fetch(`/api/reports/${id}/photo`, {
      redirect: 'manual',
    })

    if (!response.ok) {
      throw new Error(
        `Photo request failed (${response.status}): ${await response.text()}`,
      )
    }

    const { url } = (await response.json()) as { url: string }
    const image = new Image()

    image.alt = ''
    image.className = 'h-full w-full object-cover'
    image.src = url

    await image.decode()

    frame.classList.remove('photo-skeleton')
    frame.replaceChildren(image)
  } catch (cause) {
    console.warn('Unable to load the report photo', cause)

    const failed = document.createElement('p')

    failed.className =
      'flex h-full items-center justify-center text-xs text-canopee-forest/50'
    failed.textContent = 'Photo indisponible'
    frame.classList.remove('photo-skeleton')
    frame.replaceChildren(failed)
  }
}

function photoFrame(id: string): HTMLElement {
  const frame = document.createElement('div')

  frame.className = 'photo-skeleton h-29 w-full'
  void fillPhoto(frame, id)

  return frame
}

const CHEVRON_PATH = 'm9 18 6-6-6-6'

function popupContent(
  properties: ReportPinProperties,
  onOpen: ((id: string) => void) | null,
): HTMLElement {
  const root = document.createElement('div')
  root.className = 'flex w-66 flex-col'

  const band = document.createElement('div')

  band.className =
    'flex items-center gap-2 px-3 py-2 text-xs font-bold tracking-[0.06em] text-white uppercase'
  band.style.backgroundColor = REPORT_GROUP_COLORS[properties.group]
  band.append(
    iconSvg(REPORT_GROUP_ICON_PATHS[properties.group], 'size-4 shrink-0'),
    document.createTextNode(REPORT_GROUP_LABELS[properties.group]),
    statusBadge(properties.resolved),
  )

  const body = document.createElement(onOpen ? 'a' : 'div')
  body.className = onOpen
    ? 'flex items-center gap-2 px-3.5 py-3 no-underline transition-colors hover:bg-canopee-forest/5'
    : 'flex flex-col gap-1.5 px-3.5 py-3'

  const text = document.createElement('span')
  text.className = 'flex min-w-0 flex-1 flex-col gap-1.5'

  const category = document.createElement('p')
  category.className =
    'font-heading text-[0.95rem] leading-tight font-bold text-canopee-forest'
  category.textContent =
    REPORT_CATEGORY_LABELS[properties.category] ?? properties.category

  const meta = document.createElement('p')
  meta.className = 'text-xs text-canopee-forest/65'
  meta.textContent = [
    formatPinDate(properties.createdAt),
    formatEventNumber(Number(properties.eventNumber)),
  ]
    .filter(Boolean)
    .join(' · ')

  text.append(category, meta)
  body.append(text)

  if (onOpen) {
    const anchor = body as HTMLAnchorElement

    anchor.href = `/admin/issues/${properties.id}`
    anchor.append(
      iconSvg([CHEVRON_PATH], 'size-4 shrink-0 text-canopee-forest/40'),
    )
    anchor.addEventListener('click', (event) => {
      event.preventDefault()
      onOpen(properties.id)
    })
  }

  root.append(band)

  if (properties.hasPhoto) {
    root.append(photoFrame(properties.id))
  }

  root.append(body)

  return root
}

export function ReportPinsLayer({
  status = 'open',
  canOpenDetail = false,
}: {
  status?: ReportStatus
  canOpenDetail?: boolean
}) {
  const map = useSharedMap()
  const router = useRouter()
  const openDetail = useRef<((id: string) => void) | null>(null)
  const [pins, setPins] = useState<ReportPin[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [images, setImages] = useState<PinImages | null>(null)
  const { selection } = useMapFilters()

  useEffect(() => {
    openDetail.current = canOpenDetail
      ? (id) => router.push(`/admin/issues/${id}`)
      : null
  }, [canOpenDetail, router])

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
      paint: pinPaint(),
    })

    const hoverOpens = prefersHover()

    const popup = new mapboxgl.Popup({
      className: 'canopee-popup',
      closeButton: false,
      closeOnClick: !hoverOpens,
      offset: [0, -40],
      maxWidth: '17rem',
    })

    let openId: string | null = null
    let closeTimer: ReturnType<typeof setTimeout> | null = null

    const cancelClose = () => {
      if (closeTimer) {
        clearTimeout(closeTimer)
        closeTimer = null
      }
    }

    const scheduleClose = () => {
      cancelClose()
      closeTimer = setTimeout(() => popup.remove(), 160)
    }

    popup.on('close', () => {
      openId = null
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

      const properties = feature.properties as unknown as ReportPinProperties

      if (openId === properties.id && popup.isOpen()) {
        return
      }

      cancelClose()
      openId = properties.id

      popup
        .setLngLat(feature.geometry.coordinates as [number, number])
        .setDOMContent(popupContent(properties, openDetail.current))
        .addTo(map)

      const element = popup.getElement()

      element?.style.setProperty(
        '--canopee-tip',
        REPORT_GROUP_COLORS[properties.group],
      )

      if (hoverOpens) {
        element?.addEventListener('mouseenter', cancelClose)
        element?.addEventListener('mouseleave', hidePopup)
      }
    }

    const hidePopup = () => {
      cancelClose()
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
      map.on('mouseleave', REPORT_PINS_LAYER_ID, scheduleClose)
    } else {
      map.on('click', REPORT_PINS_LAYER_ID, showPopup)
    }

    return () => {
      map.off('remove', handleRemove)
      cancelClose()

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
      map.off('mouseleave', REPORT_PINS_LAYER_ID, scheduleClose)
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
  const noReportsMatch = collection !== null && collection.features.length === 0
  return (
    <>
      <ReportFilters />
      {noReportsMatch && (
        <p
          role="status"
          className="absolute bottom-52 left-1/2 z-10 -translate-x-1/2 rounded-full bg-canopee-cream/95 px-3 py-1.5 text-sm font-medium text-canopee-forest shadow-md ring-1 ring-black/5 backdrop-blur-sm"
        >
          Aucun signalement trouvé.
        </p>
      )}
    </>
  )
}
