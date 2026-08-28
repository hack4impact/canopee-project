import { describe, expect, it } from 'vitest'
import { heatmapPaint, weightCeiling } from '@/lib/heatmap/layer'

describe('weightCeiling', () => {
  it('grows with the busiest zone', () => {
    expect(weightCeiling(9)).toBeCloseTo(1)
    expect(weightCeiling(99)).toBeCloseTo(2)
  })

  it('stays above zero when there is nothing to show', () => {
    expect(weightCeiling(0)).toBeGreaterThan(0)
  })

  it('leaves room for the quiet zones', () => {
    const ceiling = weightCeiling(1140)
    const quiet = Math.log10(10 + 1) / ceiling

    expect(quiet).toBeGreaterThan(0.3)
  })
})

describe('heatmapPaint', () => {
  it('weights every zone by its point count', () => {
    expect(heatmapPaint(100)?.['heatmap-weight']).toEqual([
      'interpolate',
      ['linear'],
      ['log10', ['+', ['get', 'points'], 1]],
      0,
      0,
      weightCeiling(100),
      1,
    ])
  })

  it('leaves the emptiest areas transparent', () => {
    const color = heatmapPaint(100)?.['heatmap-color'] as unknown[]

    expect(color[4]).toBe('rgba(119, 208, 236, 0)')
  })
})
