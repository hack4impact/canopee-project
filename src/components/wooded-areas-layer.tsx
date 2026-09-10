'use client'

import { useEffect, useMemo } from 'react'
import type {
  FeatureCollection,
  MultiPolygon,
  Point,
  Polygon,
  Position,
} from 'geojson'
import { useSharedMap } from '@/components/map-provider'
import { WOODED_AREAS_GEOJSON } from '@/lib/patrols/woods'

const SOURCE_ID = 'canopee-wooded-areas'
const LABEL_SOURCE_ID = 'canopee-wooded-area-labels'
const FILL_LAYER_ID = 'canopee-wooded-areas-fill'
const OUTLINE_LAYER_ID = 'canopee-wooded-areas-outline'
const LABEL_LAYER_ID = 'canopee-wooded-areas-labels'
const CANOPEE_GREEN = '#17aa55'

function centroidForCoordinates(
  coordinates: readonly Position[],
): [number, number] {
  let totalLongitude = 0
  let totalLatitude = 0

  for (const [longitude, latitude] of coordinates) {
    totalLongitude += longitude
    totalLatitude += latitude
  }

  const count = coordinates.length

  return [totalLongitude / count, totalLatitude / count]
}

function centroidForGeometry(
  geometry: Polygon | MultiPolygon,
): [number, number] | null {
  if (geometry.type === 'Polygon') {
    return centroidForCoordinates(geometry.coordinates[0])
  }

  const coordinates = geometry.coordinates.flatMap((polygon) => polygon[0])

  return coordinates.length > 0 ? centroidForCoordinates(coordinates) : null
}

function buildWoodedAreaLabels(): FeatureCollection<Point, { NOM: string }> {
  const features = WOODED_AREAS_GEOJSON.features.flatMap((feature) => {
    if (!feature.properties?.NOM || !feature.geometry) {
      return []
    }

    const centroid = centroidForGeometry(feature.geometry)

    if (!centroid) {
      return []
    }

    return [
      {
        type: 'Feature' as const,
        properties: { NOM: feature.properties.NOM },
        geometry: {
          type: 'Point' as const,
          coordinates: centroid,
        },
      },
    ]
  })

  return {
    type: 'FeatureCollection',
    features,
  }
}

export function WoodedAreasLayer() {
  const map = useSharedMap()
  const labels = useMemo(() => buildWoodedAreaLabels(), [])

  useEffect(() => {
    if (!map) return

    if (map.getLayer(LABEL_LAYER_ID)) map.removeLayer(LABEL_LAYER_ID)
    if (map.getLayer(OUTLINE_LAYER_ID)) map.removeLayer(OUTLINE_LAYER_ID)
    if (map.getLayer(FILL_LAYER_ID)) map.removeLayer(FILL_LAYER_ID)
    if (map.getSource(LABEL_SOURCE_ID)) map.removeSource(LABEL_SOURCE_ID)
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)

    map.addSource(SOURCE_ID, { type: 'geojson', data: WOODED_AREAS_GEOJSON })
    map.addSource(LABEL_SOURCE_ID, { type: 'geojson', data: labels })
    map.addLayer({
      id: FILL_LAYER_ID,
      type: 'fill',
      source: SOURCE_ID,
      paint: {
        'fill-color': CANOPEE_GREEN,
        'fill-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          9,
          0.05,
          13,
          0.11,
        ],
      },
    })
    map.addLayer({
      id: OUTLINE_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': '#3f7a4f',
        'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.2, 15, 2.2],
        'line-opacity': 0.8,
      },
    })
    map.addLayer({
      id: LABEL_LAYER_ID,
      type: 'symbol',
      source: LABEL_SOURCE_ID,
      layout: {
        'text-field': ['get', 'NOM'],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 10, 11, 15, 16],
        'text-letter-spacing': 0.02,
        'text-anchor': 'center',
        'text-allow-overlap': true,
        'text-ignore-placement': true,
        'symbol-placement': 'point',
      },
      paint: {
        'text-color': '#0f4d2b',
        'text-halo-color': '#f6f4df',
        'text-halo-width': 2.2,
        'text-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0, 10, 1],
      },
    })

    return () => {
      if (!map.getStyle()) return
      if (map.getLayer(LABEL_LAYER_ID)) map.removeLayer(LABEL_LAYER_ID)
      if (map.getLayer(OUTLINE_LAYER_ID)) map.removeLayer(OUTLINE_LAYER_ID)
      if (map.getLayer(FILL_LAYER_ID)) map.removeLayer(FILL_LAYER_ID)
      if (map.getSource(LABEL_SOURCE_ID)) map.removeSource(LABEL_SOURCE_ID)
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }
  }, [map, labels])

  return null
}
