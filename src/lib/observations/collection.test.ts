import { describe, expect, it } from 'vitest'
import {
  isObservationCategory,
  toFeatureCollection,
  type Observation,
} from './collection'

const fauna: Observation = {
  id: 'a1',
  eventNumber: 12,
  category: 'fauna_observation',
  latitude: 45.57,
  longitude: -73.75,
}

describe('isObservationCategory', () => {
  it('accepts the two observation categories', () => {
    expect(isObservationCategory('fauna_observation')).toBe(true)
    expect(isObservationCategory('flora_observation')).toBe(true)
  })

  it('rejects the other report categories', () => {
    expect(isObservationCategory('dangerous_tree')).toBe(false)
    expect(isObservationCategory('unleashed_dog')).toBe(false)
  })
})

describe('toFeatureCollection', () => {
  it('puts longitude before latitude', () => {
    const [feature] = toFeatureCollection([fauna]).features

    expect(feature.geometry.coordinates).toEqual([-73.75, 45.57])
  })

  it('keeps the category so the layer can colour it', () => {
    const [feature] = toFeatureCollection([fauna]).features

    expect(feature.properties.category).toBe('fauna_observation')
    expect(feature.properties.eventNumber).toBe(12)
  })

  it('returns an empty collection when there is nothing to show', () => {
    expect(toFeatureCollection([])).toEqual({
      type: 'FeatureCollection',
      features: [],
    })
  })
})
