import { describe, expect, it } from 'vitest'
import {
  parseStatusParam,
  toFeatureCollection,
  DEFAULT_REPORT_STATUS,
  PIN_EXCLUDED_CATEGORIES,
  type ReportPin,
} from './pins'

const PINS: ReportPin[] = [
  {
    id: 'a1',
    eventNumber: 12,
    latitude: 45.588,
    longitude: -73.723,
    category: 'fallen_tree',
  },
  {
    id: 'b2',
    eventNumber: 34,
    latitude: 45.589,
    longitude: -73.722,
    category: 'unleashed_dog',
  },
]

describe('parseStatusParam', () => {
  it('defaults to open when the param is absent or blank', () => {
    expect(parseStatusParam(null)).toEqual({
      ok: true,
      status: DEFAULT_REPORT_STATUS,
    })
    expect(parseStatusParam(undefined)).toEqual({ ok: true, status: 'open' })
    expect(parseStatusParam('')).toEqual({ ok: true, status: 'open' })
    expect(parseStatusParam('   ')).toEqual({ ok: true, status: 'open' })
  })

  it('accepts the known statuses regardless of case or padding', () => {
    expect(parseStatusParam('open')).toEqual({ ok: true, status: 'open' })
    expect(parseStatusParam('resolved')).toEqual({
      ok: true,
      status: 'resolved',
    })
    expect(parseStatusParam('  RESOLVED  ')).toEqual({
      ok: true,
      status: 'resolved',
    })
  })

  it('reports an unknown status instead of guessing', () => {
    expect(parseStatusParam('invalid')).toEqual({ ok: false, value: 'invalid' })
    expect(parseStatusParam('closed')).toEqual({ ok: false, value: 'closed' })
    expect(parseStatusParam('1')).toEqual({ ok: false, value: '1' })
  })
})

describe('toFeatureCollection', () => {
  it('builds point features in longitude, latitude order', () => {
    const collection = toFeatureCollection(PINS)

    expect(collection.type).toBe('FeatureCollection')
    expect(collection.features).toHaveLength(2)
    expect(collection.features[0].geometry.coordinates).toEqual([
      -73.723, 45.588,
    ])
  })

  it('carries the identity a pin popup needs', () => {
    const [feature] = toFeatureCollection(PINS).features

    expect(feature.properties).toEqual({
      id: 'a1',
      eventNumber: 12,
      category: 'fallen_tree',
    })
  })

  it('handles an empty list', () => {
    expect(toFeatureCollection([]).features).toEqual([])
  })
})

describe('PIN_EXCLUDED_CATEGORIES', () => {
  it('keeps fauna and flora on their own gated layer', () => {
    expect([...PIN_EXCLUDED_CATEGORIES]).toEqual([
      'fauna_observation',
      'flora_observation',
    ])
  })
})
