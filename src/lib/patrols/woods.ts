import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
  Position,
} from 'geojson'
import type { Coordinate } from './distance'
import woodedAreasGeoJson from './boises-canopee-data.json'

const WOODED_AREA_PADDING_METRES = 100
const EARTH_RADIUS_METRES = 6371000

type WoodGeometry = Polygon | MultiPolygon

type WoodedArea = {
  name: string
  geometry: WoodGeometry
}

const NOM_ALIASES: Record<string, string> = {
  'Bois La Source': 'Bois de la Source',
  'Bois Sainte-Dorothée': 'Boisé Sainte-Dorothée',
  'Bois Ste-Dorothée': 'Boisé Sainte-Dorothée',
  'Bois du souvenir': 'Bois du Souvenir',
  'Bois de l’Équerre': "Bois de l'Équerre",
  "Bois de l'Equerre": "Bois de l'Équerre",
  "Bois l'Orée-des-Bois": "L'Orée-des-Bois",
  'Foret du 50e': 'Forêt du 50e',
}

function normaliseName(name: string): string {
  const trimmedName = name.trim()
  const byExactMatch = NOM_ALIASES[trimmedName]

  if (byExactMatch) {
    return byExactMatch
  }

  const normalizedName = removeDiacritics(trimmedName).toLowerCase()

  for (const [sourceName, canonicalName] of Object.entries(NOM_ALIASES)) {
    if (removeDiacritics(sourceName).toLowerCase() === normalizedName) {
      return canonicalName
    }
  }

  return trimmedName
}

function removeDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function isWoodFeature(
  feature: Feature<WoodGeometry, { NOM?: unknown }>,
): feature is Feature<WoodGeometry, { NOM: string }> {
  return (
    typeof feature.properties?.NOM === 'string' && feature.geometry !== null
  )
}

const collection = woodedAreasGeoJson as unknown as FeatureCollection<
  WoodGeometry,
  { NOM?: unknown }
>

export function buildWoodedAreasFromCollection(
  featureCollection: FeatureCollection<WoodGeometry, { NOM?: unknown }>,
): readonly WoodedArea[] {
  return featureCollection.features.filter(isWoodFeature).map((feature) => ({
    name: normaliseName(feature.properties.NOM),
    geometry: feature.geometry,
  }))
}

export const LAVAL_WOODED_AREAS: readonly WoodedArea[] =
  buildWoodedAreasFromCollection(collection)

export type WoodedAreasGeoJson = FeatureCollection<
  Polygon | MultiPolygon,
  { NOM: string }
>

export const WOODED_AREAS_GEOJSON: WoodedAreasGeoJson = {
  type: 'FeatureCollection',
  features: LAVAL_WOODED_AREAS.map((area) => ({
    type: 'Feature',
    properties: { NOM: area.name },
    geometry: area.geometry,
  })),
}

function toCoordinatePair(vertex: Position): [number, number] {
  const [longitude, latitude] = vertex
  return [Number(longitude), Number(latitude)]
}

function pointInRing(point: Coordinate, ring: readonly Position[]): boolean {
  let inside = false
  const x = point.longitude
  const y = point.latitude

  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index++
  ) {
    const [currentX, currentY] = toCoordinatePair(ring[index])
    const [previousX, previousY] = toCoordinatePair(ring[previous])
    const intersects =
      currentY > y !== previousY > y &&
      x <
        ((previousX - currentX) * (y - currentY)) / (previousY - currentY) +
          currentX

    if (intersects) inside = !inside
  }

  return inside
}

function pointInPolygon(point: Coordinate, polygon: Polygon): boolean {
  const [outer, ...holes] = polygon.coordinates

  return (
    pointInRing(point, outer) && !holes.some((hole) => pointInRing(point, hole))
  )
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function pointToPointDistanceMetres(a: Coordinate, b: Coordinate): number {
  const deltaLatitude = toRadians(b.latitude - a.latitude)
  const deltaLongitude = toRadians(b.longitude - a.longitude)

  const h =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      Math.sin(deltaLongitude / 2) ** 2

  return EARTH_RADIUS_METRES * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function pointToSegmentDistanceMetres(
  point: Coordinate,
  start: [number, number],
  end: [number, number],
): number {
  const [startLongitude, startLatitude] = start
  const [endLongitude, endLatitude] = end
  const startPoint = { latitude: startLatitude, longitude: startLongitude }
  const dx = endLongitude - startLongitude
  const dy = endLatitude - startLatitude

  if (dx === 0 && dy === 0) {
    return pointToPointDistanceMetres(point, startPoint)
  }

  const projection =
    ((point.longitude - startLongitude) * dx +
      (point.latitude - startLatitude) * dy) /
    (dx * dx + dy * dy)

  const clamped = Math.max(0, Math.min(1, projection))
  const projectedPoint = {
    latitude: startLatitude + clamped * dy,
    longitude: startLongitude + clamped * dx,
  }

  return pointToPointDistanceMetres(point, projectedPoint)
}

function pointIsNearPolygon(point: Coordinate, polygon: Polygon): boolean {
  const [outer] = polygon.coordinates

  return outer.some((vertex, index) => {
    const nextIndex = (index + 1) % outer.length
    const [longitude, latitude] = toCoordinatePair(vertex)
    const [nextLongitude, nextLatitude] = toCoordinatePair(outer[nextIndex])

    return (
      pointToSegmentDistanceMetres(
        point,
        [longitude, latitude],
        [nextLongitude, nextLatitude],
      ) <= WOODED_AREA_PADDING_METRES
    )
  })
}

function contains(area: WoodedArea, point: Coordinate): boolean {
  if (area.geometry.type === 'Polygon') {
    const insidePolygon = pointInPolygon(point, area.geometry)

    return insidePolygon || pointIsNearPolygon(point, area.geometry)
  }

  return area.geometry.coordinates.some((polygon) => {
    const polygonArea = { type: 'Polygon', coordinates: polygon } as Polygon

    return (
      pointInPolygon(point, polygonArea) ||
      pointIsNearPolygon(point, polygonArea)
    )
  })
}

export function findWoodedArea(points: readonly Coordinate[]): string | null {
  const tally = new Map<string, number>()

  for (const point of points) {
    for (const area of LAVAL_WOODED_AREAS) {
      if (contains(area, point)) {
        tally.set(area.name, (tally.get(area.name) ?? 0) + 1)
      }
    }
  }

  let best: string | null = null
  let bestCount = 0

  for (const [name, count] of tally) {
    if (count > bestCount) {
      best = name
      bestCount = count
    }
  }

  return best
}

export function woodedAreaAt(point: Coordinate): string | null {
  return findWoodedArea([point])
}
