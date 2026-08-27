import { describe, expect, it } from 'vitest'
import {
  hasDrawableRoute,
  routeBounds,
  toLineCoordinates,
  type RoutePoint,
} from '@/lib/patrols/polyline'

const BOIS_PAPINEAU: RoutePoint[] = [
  { latitude: 45.5885, longitude: -73.723 },
  { latitude: 45.5893, longitude: -73.7216 },
  { latitude: 45.5889, longitude: -73.7223 },
]

describe('toLineCoordinates', () => {
  it('puts the longitude first', () => {
    expect(toLineCoordinates([BOIS_PAPINEAU[0]])).toEqual([[-73.723, 45.5885]])
  })

  it('keeps the recorded order', () => {
    expect(toLineCoordinates(BOIS_PAPINEAU)).toEqual([
      [-73.723, 45.5885],
      [-73.7216, 45.5893],
      [-73.7223, 45.5889],
    ])
  })

  it('returns nothing for a patrol without points', () => {
    expect(toLineCoordinates([])).toEqual([])
  })
})

describe('hasDrawableRoute', () => {
  it('refuses a patrol without points', () => {
    expect(hasDrawableRoute([])).toBe(false)
  })

  it('refuses a single point', () => {
    expect(hasDrawableRoute(BOIS_PAPINEAU.slice(0, 1))).toBe(false)
  })

  it('accepts two points', () => {
    expect(hasDrawableRoute(BOIS_PAPINEAU.slice(0, 2))).toBe(true)
  })
})

describe('routeBounds', () => {
  it('is null without coordinates', () => {
    expect(routeBounds([])).toBeNull()
  })

  it('frames every point, not only the first and the last', () => {
    expect(routeBounds(toLineCoordinates(BOIS_PAPINEAU))).toEqual([
      [-73.723, 45.5885],
      [-73.7216, 45.5893],
    ])
  })

  it('collapses when the patroller never moved', () => {
    const coordinates = toLineCoordinates([BOIS_PAPINEAU[0], BOIS_PAPINEAU[0]])

    expect(routeBounds(coordinates)).toEqual([
      [-73.723, 45.5885],
      [-73.723, 45.5885],
    ])
  })
})
