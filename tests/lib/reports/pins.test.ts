import { describe, expect, it } from 'vitest'
import {
  parseCategoriesParam,
  parseStatusParam,
  toFeatureCollection,
  DEFAULT_REPORT_STATUS,
  PIN_CATEGORIES,
  PIN_EXCLUDED_CATEGORIES,
  type ReportPin,
} from '@/lib/reports/pins'

const PINS: ReportPin[] = [
  {
    id: 'a1',
    eventNumber: 12,
    latitude: 45.588,
    longitude: -73.723,
    category: 'fallen_tree',
    hasPhoto: true,
    createdAt: '2026-08-12T18:20:00.000Z',
    resolvedAt: null,
  },
  {
    id: 'b2',
    eventNumber: 34,
    latitude: 45.589,
    longitude: -73.722,
    category: 'unleashed_dog',
    hasPhoto: false,
    createdAt: '2026-08-09T14:05:00.000Z',
    resolvedAt: '2026-08-10T12:00:00.000Z',
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

describe('parseCategoriesParam', () => {
  it('defaults to every pinnable category when the param is absent or blank', () => {
    expect(parseCategoriesParam(null)).toEqual({
      ok: true,
      categories: PIN_CATEGORIES,
    })
    expect(parseCategoriesParam(undefined)).toEqual({
      ok: true,
      categories: PIN_CATEGORIES,
    })
    expect(parseCategoriesParam('  ')).toEqual({
      ok: true,
      categories: PIN_CATEGORIES,
    })
  })

  it('accepts a comma separated list regardless of case or padding', () => {
    expect(parseCategoriesParam('  DANGEROUS_TREE , littering ')).toEqual({
      ok: true,
      categories: ['dangerous_tree', 'littering'],
    })
  })

  it('drops duplicates and returns a stable order', () => {
    expect(parseCategoriesParam('littering,dangerous_tree,littering')).toEqual({
      ok: true,
      categories: ['dangerous_tree', 'littering'],
    })
  })

  it('rejects a category that does not exist', () => {
    expect(parseCategoriesParam('dangerous_tree,dragons')).toEqual({
      ok: false,
      value: 'dragons',
    })
  })

  it('rejects a fauna or flora category, which has no pin', () => {
    expect(parseCategoriesParam('oiseau')).toEqual({
      ok: false,
      value: 'oiseau',
    })
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
      group: 'entretien',
      hasPhoto: true,
      createdAt: '2026-08-12T18:20:00.000Z',
      resolved: false,
    })
  })

  it('marks a pin resolved once it carries a resolution date', () => {
    const [, feature] = toFeatureCollection(PINS).features

    expect(feature.properties.resolved).toBe(true)
    expect(feature.properties.hasPhoto).toBe(false)
  })

  it('handles an empty list', () => {
    expect(toFeatureCollection([]).features).toEqual([])
  })
})

describe('PIN_EXCLUDED_CATEGORIES', () => {
  it('keeps fauna and flora on their own gated layer', () => {
    expect([...PIN_EXCLUDED_CATEGORIES]).toEqual([
      'reptile',
      'insecte',
      'oiseau',
      'amphibien',
      'mammifere',
      'invertebre',
      'mollusque',
      'poisson',
      'plante_vasculaire',
      'bryophyte',
      'faune_flore_other',
    ])
  })
})

describe('pin groups', () => {
  it('tags each pin with the group that colours it', () => {
    const groups = toFeatureCollection(PINS).features.map(
      (feature) => feature.properties.group,
    )

    expect(groups).toEqual(['entretien', 'citoyen'])
  })
})
