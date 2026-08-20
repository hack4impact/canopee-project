import { describe, expect, it } from 'vitest'
import { toFeatureCollection, type Observation } from './collection'

const fauna: Observation = {
  id: 'a1',
  category: 'fauna_observation',
  latitude: 45.57,
  longitude: -73.75,
}

describe('toFeatureCollection', () => {
  it('puts longitude before latitude', () => {
    const [feature] = toFeatureCollection([fauna]).features

    expect(feature.geometry.coordinates).toEqual([-73.75, 45.57])
  })

  it('keeps the category so the layer can colour it', () => {
    const [feature] = toFeatureCollection([fauna]).features

    expect(feature.properties.category).toBe('fauna_observation')
  })

  it('returns an empty collection when there is nothing to show', () => {
    expect(toFeatureCollection([])).toEqual({
      type: 'FeatureCollection',
      features: [],
    })
  })
})
