import { describe, expect, it } from 'vitest'
import { LAVAL_BOUNDS } from '@/lib/mapbox/config'
import { clampToLavalBounds, isWithinLavalBounds } from '@/lib/reports/location'

const [[west, south], [east, north]] = LAVAL_BOUNDS

const INSIDE = { latitude: 45.5871, longitude: -73.723 }

describe('clampToLavalBounds', () => {
  it('leaves a pin dropped inside the wooded areas untouched', () => {
    expect(clampToLavalBounds(INSIDE)).toEqual(INSIDE)
  })

  it('pulls a pin dragged past the north-east corner back onto the bounds', () => {
    expect(
      clampToLavalBounds({ latitude: north + 1, longitude: east + 1 }),
    ).toEqual({ latitude: north, longitude: east })
  })

  it('pulls a pin dragged past the south-west corner back onto the bounds', () => {
    expect(
      clampToLavalBounds({ latitude: south - 1, longitude: west - 1 }),
    ).toEqual({ latitude: south, longitude: west })
  })

  it('clamps each axis independently', () => {
    expect(
      clampToLavalBounds({ latitude: INSIDE.latitude, longitude: east + 5 }),
    ).toEqual({ latitude: INSIDE.latitude, longitude: east })
  })
})

describe('isWithinLavalBounds', () => {
  it('accepts a position inside Laval', () => {
    expect(isWithinLavalBounds(INSIDE)).toBe(true)
  })

  it('rejects a position on the far shore, even inside the loose bounding rectangle', () => {
    // Rosemère, across the Rivière des Mille Îles: inside LAVAL_BOUNDS but not in Laval.
    const rosemere = { latitude: 45.637, longitude: -73.798 }

    expect(isWithinLavalBounds(rosemere)).toBe(false)
    expect(isWithinLavalBounds(clampToLavalBounds(rosemere))).toBe(false)
  })

  it('rejects a position outside Laval', () => {
    expect(
      isWithinLavalBounds({ latitude: south - 0.01, longitude: -73.723 }),
    ).toBe(false)
    expect(
      isWithinLavalBounds({
        latitude: INSIDE.latitude,
        longitude: east + 0.01,
      }),
    ).toBe(false)
  })
})
