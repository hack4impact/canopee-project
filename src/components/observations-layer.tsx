'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { useRouter } from 'next/navigation'
import { useMapFilters } from '@/components/map-filters-provider'
import { useSharedMap } from '@/components/map-provider'
import type { ObservationCollection } from '@/lib/observations/collection'
import {
  OBSERVATION_PIN_IMAGE_ID,
  observationPinLayout,
  observationPinSvg,
  OBSERVATIONS_LAYER_ID,
  OBSERVATIONS_SOURCE_ID,
} from '@/lib/observations/layer'
import { REPORT_GROUP_COLORS } from '@/lib/reports/group-style'
import {
  pinPopupContent,
  prefersHover,
  type PinPopupProperties,
} from '@/lib/reports/pin-popup'
import { observationCategoriesOf } from '@/lib/reports/filters'

type ObservationsPayload = {
  observations: ObservationCollection
}

function loadPinImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () =>
      reject(new Error('Unable to draw the fauna/flore pin'))
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      observationPinSvg(),
    )}`
  })
}

export function ObservationsLayer({
  canOpenDetail = false,
}: {
  canOpenDetail?: boolean
}) {
  const map = useSharedMap()
  const router = useRouter()
  const openDetail = useRef<((id: string) => void) | null>(null)
  const [payload, setPayload] = useState<ObservationsPayload | null>(null)
  const [failed, setFailed] = useState(false)
  const { selection } = useMapFilters()
  const categoriesKey = observationCategoriesOf(selection).join(',')
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    openDetail.current = canOpenDetail
      ? (id) => router.push(`/admin/issues/${id}`)
      : null
  }, [canOpenDetail, router])

  useEffect(() => {
    let cancelled = false

    loadPinImage()
      .then((loaded) => {
        if (!cancelled) {
          setImage(loaded)
        }
      })
      .catch((cause) => {
        if (!cancelled) {
          console.warn('Unable to draw the fauna/flore pins', cause)
          setFailed(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadObservations() {
      try {
        const response = await fetch('/api/observations', {
          redirect: 'manual',
        })

        if (!response.ok) {
          throw new Error(`Observations request failed (${response.status})`)
        }

        const data = (await response.json()) as ObservationsPayload

        if (!cancelled) {
          setPayload(data)
        }
      } catch (cause) {
        if (!cancelled) {
          console.warn('Unable to load the fauna and flora layer', cause)
          setFailed(true)
        }
      }
    }

    void loadObservations()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (
      !map ||
      !payload ||
      !image ||
      payload.observations.features.length === 0
    ) {
      return
    }

    let mapRemoved = false
    const handleRemove = () => {
      mapRemoved = true
    }

    map.on('remove', handleRemove)

    if (!map.hasImage(OBSERVATION_PIN_IMAGE_ID)) {
      map.addImage(OBSERVATION_PIN_IMAGE_ID, image, { pixelRatio: 2 })
    }

    map.addSource(OBSERVATIONS_SOURCE_ID, {
      type: 'geojson',
      data: payload.observations,
    })

    map.addLayer({
      id: OBSERVATIONS_LAYER_ID,
      type: 'symbol',
      source: OBSERVATIONS_SOURCE_ID,
      layout: observationPinLayout(),
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

    const hidePopup = () => {
      cancelClose()
      popup.remove()
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

      const properties = feature.properties as unknown as PinPopupProperties

      if (openId === properties.id && popup.isOpen()) {
        return
      }

      cancelClose()
      openId = properties.id

      popup
        .setLngLat(feature.geometry.coordinates as [number, number])
        .setDOMContent(pinPopupContent(properties, openDetail.current))
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

    const showPointer = () => {
      map.getCanvas().style.cursor = 'pointer'
    }

    const clearPointer = () => {
      map.getCanvas().style.cursor = ''
    }

    map.on('mouseenter', OBSERVATIONS_LAYER_ID, showPointer)
    map.on('mouseleave', OBSERVATIONS_LAYER_ID, clearPointer)

    if (hoverOpens) {
      map.on('mousemove', OBSERVATIONS_LAYER_ID, showPopup)
      map.on('mouseleave', OBSERVATIONS_LAYER_ID, scheduleClose)
    } else {
      map.on('click', OBSERVATIONS_LAYER_ID, showPopup)
    }

    return () => {
      map.off('remove', handleRemove)
      cancelClose()

      if (mapRemoved) {
        return
      }

      popup.remove()

      map.off('mouseenter', OBSERVATIONS_LAYER_ID, showPointer)
      map.off('mouseleave', OBSERVATIONS_LAYER_ID, clearPointer)
      map.off('mousemove', OBSERVATIONS_LAYER_ID, showPopup)
      map.off('mouseleave', OBSERVATIONS_LAYER_ID, scheduleClose)
      map.off('click', OBSERVATIONS_LAYER_ID, showPopup)

      if (map.getLayer(OBSERVATIONS_LAYER_ID)) {
        map.removeLayer(OBSERVATIONS_LAYER_ID)
      }

      if (map.getSource(OBSERVATIONS_SOURCE_ID)) {
        map.removeSource(OBSERVATIONS_SOURCE_ID)
      }

      if (map.hasImage(OBSERVATION_PIN_IMAGE_ID)) {
        map.removeImage(OBSERVATION_PIN_IMAGE_ID)
      }
    }
  }, [map, payload, image])

  useEffect(() => {
    if (!map || !map.getLayer(OBSERVATIONS_LAYER_ID)) {
      return
    }

    map.setFilter(OBSERVATIONS_LAYER_ID, [
      'in',
      ['get', 'category'],
      ['literal', categoriesKey === '' ? [] : categoriesKey.split(',')],
    ])
  }, [map, payload, image, categoriesKey])

  if (failed) {
    return (
      <p
        role="status"
        className="absolute bottom-40 left-1/2 z-10 -translate-x-1/2 rounded-full bg-canopee-cream/95 px-3 py-1.5 text-sm font-medium text-canopee-forest shadow-md ring-1 ring-black/5 backdrop-blur-sm"
      >
        Impossible d&apos;afficher les observations de faune et de flore.
      </p>
    )
  }

  return null
}
