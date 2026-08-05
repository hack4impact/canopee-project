/** Mapbox Outdoors style, suited to wooded and trail areas. */
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

/** Reads the public Mapbox token from the environment. */
export function getMapboxToken(): string | undefined {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN
}
