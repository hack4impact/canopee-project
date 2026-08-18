import { describe, expect, it } from 'vitest'
import {
  DEFAULT_WINDOW_MONTHS,
  MAX_WINDOW_MONTHS,
  maxPoints,
  parseMonthsParam,
  toFeatureCollection,
  windowStart,
  type HeatmapZone,
} from './zones'

const ZONES: HeatmapZone[] = [
  { latitude: 45.588, longitude: -73.723, points: 42, patrols: 3 },
  { latitude: 45.589, longitude: -73.722, points: 7, patrols: 1 },
]

describe('parseMonthsParam', () => {
  it('falls back to two months', () => {
    expect(parseMonthsParam(null)).toBe(DEFAULT_WINDOW_MONTHS)
    expect(parseMonthsParam('')).toBe(DEFAULT_WINDOW_MONTHS)
    expect(parseMonthsParam('trois')).toBe(DEFAULT_WINDOW_MONTHS)
    expect(parseMonthsParam('1.5')).toBe(DEFAULT_WINDOW_MONTHS)
    expect(parseMonthsParam('0')).toBe(DEFAULT_WINDOW_MONTHS)
    expect(parseMonthsParam('-4')).toBe(DEFAULT_WINDOW_MONTHS)
  })

  it('accepts a whole number of months', () => {
    expect(parseMonthsParam('6')).toBe(6)
  })

  it('caps how far back a caller can ask for', () => {
    expect(parseMonthsParam('999')).toBe(MAX_WINDOW_MONTHS)
  })
})

describe('windowStart', () => {
  it('goes back two months', () => {
    expect(windowStart(new Date('2026-08-15T10:00:00Z')).toISOString()).toBe(
      '2026-06-15T10:00:00.000Z',
    )
  })

  it('crosses the new year', () => {
    expect(windowStart(new Date('2026-01-31T00:00:00Z')).toISOString()).toBe(
      '2025-11-30T00:00:00.000Z',
    )
  })

  it('clamps to the last day of a shorter month', () => {
    expect(windowStart(new Date('2026-04-30T00:00:00Z')).toISOString()).toBe(
      '2026-02-28T00:00:00.000Z',
    )
  })

  it('accepts another number of months', () => {
    expect(windowStart(new Date('2026-08-15T00:00:00Z'), 6).toISOString()).toBe(
      '2026-02-15T00:00:00.000Z',
    )
  })
})

describe('toFeatureCollection', () => {
  it('puts the longitude first', () => {
    const [feature] = toFeatureCollection(ZONES).features

    expect(feature.geometry.coordinates).toEqual([-73.723, 45.588])
  })

  it('keeps both counts on the feature', () => {
    const [feature] = toFeatureCollection(ZONES).features

    expect(feature.properties).toEqual({ points: 42, patrols: 3 })
  })

  it('stays empty when there is nothing to show', () => {
    expect(toFeatureCollection([])).toEqual({
      type: 'FeatureCollection',
      features: [],
    })
  })
})

describe('maxPoints', () => {
  it('is the biggest count', () => {
    expect(maxPoints(ZONES)).toBe(42)
  })

  it('is zero without zones', () => {
    expect(maxPoints([])).toBe(0)
  })
})
