import { describe, expect, it } from 'vitest'
import {
  LAVAL_WOODED_VIEW,
  MAPBOX_OUTDOORS_STYLE,
  getMapboxToken,
} from '@/lib/mapbox/config'

describe('mapbox config', () => {
  it('uses the Outdoors style', () => {
    expect(MAPBOX_OUTDOORS_STYLE).toBe('mapbox://styles/mapbox/outdoors-v12')
  })

  it('centers the default view on Laval wooded areas', () => {
    expect(LAVAL_WOODED_VIEW.latitude).toBeGreaterThan(45.5)
    expect(LAVAL_WOODED_VIEW.latitude).toBeLessThan(45.65)
    expect(LAVAL_WOODED_VIEW.longitude).toBeGreaterThan(-73.85)
    expect(LAVAL_WOODED_VIEW.longitude).toBeLessThan(-73.65)
    expect(LAVAL_WOODED_VIEW.zoom).toBeGreaterThanOrEqual(10)
    expect(LAVAL_WOODED_VIEW.zoom).toBeLessThanOrEqual(14)
  })

  it('returns the public token from the environment when set', () => {
    const previous = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    const previousLegacy = process.env.MAPBOX_TOXEN
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'pk.test-token'
    delete process.env.MAPBOX_TOXEN

    expect(getMapboxToken()).toBe('pk.test-token')

    if (previous === undefined) {
      delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    } else {
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN = previous
    }

    if (previousLegacy === undefined) {
      delete process.env.MAPBOX_TOXEN
    } else {
      process.env.MAPBOX_TOXEN = previousLegacy
    }
  })
})
