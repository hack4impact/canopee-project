export const MAPBOX_OUTDOORS_STYLE = 'mapbox://styles/mapbox/outdoors-v12'

export const LAVAL_WOODED_VIEW = {
  longitude: -73.723,
  latitude: 45.587,
  zoom: 12,
} as const

export type MapViewport = {
  longitude: number
  latitude: number
  zoom: number
}

export function getMapboxToken(): string | undefined {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? process.env.MAPBOX_TOXEN
}
