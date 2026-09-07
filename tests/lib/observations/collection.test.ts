import { describe, expect, it } from 'vitest'
import {
  toFeatureCollection,
  type Observation,
} from '@/lib/observations/collection'

const observation: Observation = {
  id: 'a1',
  eventNumber: 12,
  category: 'reptile',
  latitude: 45.57,
  longitude: -73.75,
  species: 'Couleuvre rayée',
  hasPhoto: true,
  createdAt: '2026-07-04T12:00:00.000Z',
  resolvedAt: null,
}

describe('toFeatureCollection', () => {
  it('puts longitude before latitude', () => {
    const [feature] = toFeatureCollection([observation]).features

    expect(feature.geometry.coordinates).toEqual([-73.75, 45.57])
  })

  it('keeps the category so the layer can colour it', () => {
    const [feature] = toFeatureCollection([observation]).features

    expect(feature.properties.category).toBe('reptile')
  })

  it('returns an empty collection when there is nothing to show', () => {
    expect(toFeatureCollection([])).toEqual({
      type: 'FeatureCollection',
      features: [],
    })
  })
})
