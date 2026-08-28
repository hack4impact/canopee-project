import { describe, expect, it } from 'vitest'
import {
  distanceBetweenMetres,
  totalDistanceMetres,
  type Coordinate,
} from '@/lib/patrols/distance'

const BOIS_PAPINEAU_LOOP: Coordinate[] = [
  { latitude: 45.5885, longitude: -73.723 },
  { latitude: 45.5889, longitude: -73.7223 },
  { latitude: 45.5893, longitude: -73.7216 },
  { latitude: 45.5898, longitude: -73.721 },
  { latitude: 45.5902, longitude: -73.7203 },
  { latitude: 45.5907, longitude: -73.7197 },
  { latitude: 45.5911, longitude: -73.719 },
  { latitude: 45.5914, longitude: -73.7182 },
  { latitude: 45.591, longitude: -73.7176 },
  { latitude: 45.5905, longitude: -73.7179 },
  { latitude: 45.59, longitude: -73.7184 },
  { latitude: 45.5895, longitude: -73.719 },
  { latitude: 45.589, longitude: -73.7197 },
  { latitude: 45.5886, longitude: -73.7204 },
  { latitude: 45.5884, longitude: -73.7212 },
  { latitude: 45.5884, longitude: -73.7221 },
]

describe('distanceBetweenMetres', () => {
  it('measures no distance between a point and itself', () => {
    const point: Coordinate = { latitude: 45.6, longitude: -73.7 }

    expect(distanceBetweenMetres(point, point)).toBe(0)
  })

  it('measures a degree of latitude as the arc length of the angle', () => {
    expect(
      distanceBetweenMetres(
        { latitude: 0, longitude: 0 },
        { latitude: 1, longitude: 0 },
      ),
    ).toBeCloseTo(111195, -2)
  })

  it('shrinks a degree of longitude by the cosine of the latitude', () => {
    expect(
      distanceBetweenMetres(
        { latitude: 45.6, longitude: 0 },
        { latitude: 45.6, longitude: 1 },
      ),
    ).toBeCloseTo(77798, -1)
  })

  it('is symmetric', () => {
    const a: Coordinate = { latitude: 45.5, longitude: -73.6 }
    const b: Coordinate = { latitude: 45.6, longitude: -73.5 }

    expect(distanceBetweenMetres(a, b)).toBeCloseTo(
      distanceBetweenMetres(b, a),
      6,
    )
  })
})

describe('totalDistanceMetres', () => {
  it('measures no distance when there is no leg to walk', () => {
    expect(totalDistanceMetres([])).toBe(0)
    expect(totalDistanceMetres([{ latitude: 45.6, longitude: -73.7 }])).toBe(0)
  })

  it('sums the legs of a multi-point route', () => {
    const points: Coordinate[] = [
      { latitude: 45.5, longitude: -73.6 },
      { latitude: 45.51, longitude: -73.6 },
      { latitude: 45.52, longitude: -73.6 },
    ]

    const legByLeg =
      distanceBetweenMetres(points[0], points[1]) +
      distanceBetweenMetres(points[1], points[2])

    expect(totalDistanceMetres(points)).toBeCloseTo(legByLeg, 6)
  })

  it('sums a seeded patrol route to a plausible walking distance', () => {
    expect(totalDistanceMetres(BOIS_PAPINEAU_LOOP)).toBeCloseTo(1047, -1)
  })
})
