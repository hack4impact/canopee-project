import type { FeatureCollection, Point } from 'geojson'
import type {
  CircleLayerSpecification,
  SymbolLayerSpecification,
} from 'mapbox-gl'
import { OBSERVATION_CATEGORIES } from '@/lib/observations/collection'
import {
  reportGroupOfCategory,
  type ReportCategory,
  type ReportGroup,
} from '@/lib/reports/categories'

export const REPORT_PINS_SOURCE_ID = 'report-pins'

export const REPORT_PINS_LAYER_ID = 'report-pins-points'

export const REPORT_CLUSTERS_LAYER_ID = 'report-pins-clusters'

export const REPORT_CLUSTER_COUNT_LAYER_ID = 'report-pins-cluster-count'

export const CLUSTER_RADIUS_PX = 48

export const CLUSTER_MAX_ZOOM = 14

export const CLUSTER_COLOR = '#004523'

const CREAM = '#f6f4df'

const LOW_ZOOM = 10

const HIGH_ZOOM = 16

export const REPORT_STATUSES = ['open', 'resolved'] as const

export type ReportStatus = (typeof REPORT_STATUSES)[number]

export const DEFAULT_REPORT_STATUS: ReportStatus = 'open'

export const PIN_EXCLUDED_CATEGORIES = OBSERVATION_CATEGORIES

export type ParsedStatus =
  { ok: true; status: ReportStatus } | { ok: false; value: string }

export function isReportStatus(value: string): value is ReportStatus {
  return (REPORT_STATUSES as readonly string[]).includes(value)
}

export function parseStatusParam(
  value: string | null | undefined,
): ParsedStatus {
  if (value === null || value === undefined || value.trim() === '') {
    return { ok: true, status: DEFAULT_REPORT_STATUS }
  }

  const normalized = value.trim().toLowerCase()

  return isReportStatus(normalized)
    ? { ok: true, status: normalized }
    : { ok: false, value }
}

export type ReportPin = {
  id: string
  eventNumber: number
  latitude: number
  longitude: number
  category: ReportCategory
}

export type ReportPinProperties = {
  id: string
  eventNumber: number
  category: ReportCategory
  group: ReportGroup
}

export type ReportPinCollection = FeatureCollection<Point, ReportPinProperties>

export function toFeatureCollection(
  pins: readonly ReportPin[],
): ReportPinCollection {
  return {
    type: 'FeatureCollection',
    features: pins.map((pin) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [pin.longitude, pin.latitude],
      },
      properties: {
        id: pin.id,
        eventNumber: pin.eventNumber,
        category: pin.category,
        group: reportGroupOfCategory(pin.category),
      },
    })),
  }
}

export function pinImageId(group: ReportGroup): string {
  return `report-pin-${group}`
}

export function pinLayout(): SymbolLayerSpecification['layout'] {
  return {
    'icon-image': ['concat', 'report-pin-', ['get', 'group']],
    'icon-size': [
      'interpolate',
      ['linear'],
      ['zoom'],
      LOW_ZOOM,
      0.65,
      HIGH_ZOOM,
      1,
    ],
    'icon-anchor': 'bottom',
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
  }
}

export function clusterPaint(): CircleLayerSpecification['paint'] {
  return {
    'circle-color': CLUSTER_COLOR,
    'circle-opacity': 0.9,
    'circle-radius': ['step', ['get', 'point_count'], 16, 10, 21, 25, 27],
    'circle-stroke-width': 2,
    'circle-stroke-color': CREAM,
  }
}

export function clusterCountLayout(): SymbolLayerSpecification['layout'] {
  return {
    'text-field': ['get', 'point_count_abbreviated'],
    'text-size': 13,
    'text-allow-overlap': true,
  }
}

export function clusterCountPaint(): SymbolLayerSpecification['paint'] {
  return {
    'text-color': CREAM,
  }
}
