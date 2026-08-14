import { describe, expect, it } from 'vitest'
import { haversineMeters, totalRouteMeters } from '@/lib/patrols/distance'

describe('haversineMeters', () => {
  it('is zero between a point and itself', () => {
    const point = { latitude: 45.57, longitude: -73.75 }

    expect(haversineMeters(point, point)).toBe(0)
  })

  it('matches a known distance within 0.5%', () => {
    // One degree of latitude is ~111.2 km anywhere on the globe.
    const meters = haversineMeters(
      { latitude: 45, longitude: -73 },
      { latitude: 46, longitude: -73 },
    )

    expect(meters).toBeGreaterThan(111_000)
    expect(meters).toBeLessThan(111_400)
  })

  it('is symmetric', () => {
    const a = { latitude: 45.5, longitude: -73.6 }
    const b = { latitude: 45.6, longitude: -73.5 }

    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6)
  })
})

describe('totalRouteMeters', () => {
  it('is zero for an empty route', () => {
    expect(totalRouteMeters([])).toBe(0)
  })

  it('is zero for a single point', () => {
    expect(totalRouteMeters([{ latitude: 45.5, longitude: -73.6 }])).toBe(0)
  })

  it('sums the legs of a multi-point route', () => {
    const points = [
      { latitude: 45.5, longitude: -73.6 },
      { latitude: 45.51, longitude: -73.6 },
      { latitude: 45.52, longitude: -73.6 },
    ]

    const legByLeg =
      haversineMeters(points[0], points[1]) +
      haversineMeters(points[1], points[2])

    expect(totalRouteMeters(points)).toBeCloseTo(legByLeg, 6)
  })
})
