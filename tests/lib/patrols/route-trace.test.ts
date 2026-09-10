import { describe, expect, it } from 'vitest'
import { MAX_TRACE_POINTS, normalizeRoute } from '@/lib/patrols/route-trace'

function line(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    latitude: 45.5 + index * 0.001,
    longitude: -73.5 + index * 0.001,
  }))
}

describe('normalizeRoute', () => {
  it('needs at least two points to draw anything', () => {
    expect(normalizeRoute([])).toEqual([])
    expect(normalizeRoute([{ latitude: 45.5, longitude: -73.5 }])).toEqual([])
  })

  it('returns nothing when the patroller has not moved', () => {
    const still = [
      { latitude: 45.5, longitude: -73.5 },
      { latitude: 45.5, longitude: -73.5 },
    ]

    expect(normalizeRoute(still)).toEqual([])
  })

  it('scales every coordinate into the unit box', () => {
    const trace = normalizeRoute(line(10))

    expect(trace.length).toBe(20)
    expect(Math.min(...trace)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...trace)).toBeLessThanOrEqual(1)
  })

  it('keeps the payload small on a long walk', () => {
    const trace = normalizeRoute(line(5000))

    expect(trace.length).toBeLessThanOrEqual((MAX_TRACE_POINTS + 1) * 2)
  })

  it('always keeps the most recent position', () => {
    const points = line(97)
    const trace = normalizeRoute(points)

    expect(trace[trace.length - 2]).toBeCloseTo(1, 3)
    expect(trace[trace.length - 1]).toBeCloseTo(1, 3)
  })

  it('centres a route that is wider than it is tall', () => {
    const trace = normalizeRoute([
      { latitude: 45.5, longitude: -73.5 },
      { latitude: 45.5001, longitude: -73.4 },
    ])

    expect(trace[1]).toBeCloseTo(0.5, 2)
    expect(trace[3]).toBeCloseTo(0.5, 2)
  })
})
