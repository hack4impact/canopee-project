import { describe, expect, it } from 'vitest'
import { OBSERVATION_CATEGORIES } from './collection'
import {
  OBSERVATION_COLOR,
  OBSERVATION_LEGEND,
  observationsPaint,
} from './layer'

describe('observationsPaint', () => {
  it('uses the observation colour', () => {
    const color = observationsPaint()?.['circle-color']

    expect(color).toBe(OBSERVATION_COLOR)
  })

  it('grows the circles as the map zooms in', () => {
    const radius = observationsPaint()?.['circle-radius'] as unknown[]
    const near = radius.at(-1) as number
    const far = radius.at(-3) as number

    expect(near).toBeGreaterThan(far)
  })
})

describe('OBSERVATION_LEGEND', () => {
  it('explains every category the layer can draw', () => {
    expect(OBSERVATION_LEGEND.map((entry) => entry.category)).toEqual([
      ...OBSERVATION_CATEGORIES,
    ])
  })

  it('reuses the colours the circles are painted with', () => {
    const color = observationsPaint()?.['circle-color'] as unknown[]

    for (const entry of OBSERVATION_LEGEND) {
      expect(color).toContain(entry.color)
    }
  })

  it('labels each swatch', () => {
    for (const entry of OBSERVATION_LEGEND) {
      expect(entry.label.trim()).not.toBe('')
    }
  })
})
