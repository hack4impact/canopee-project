import { describe, expect, it } from 'vitest'
import { OBSERVATION_CATEGORIES } from './collection'
import {
  OBSERVATION_COLOR,
  OBSERVATION_LEGEND,
  OBSERVATION_PIN_IMAGE_ID,
  observationPinLayout,
  observationPinSvg,
} from './layer'

describe('observationPinSvg', () => {
  it('renders a teardrop pin in the observation colour', () => {
    const svg = observationPinSvg()

    expect(svg).toContain(
      'M16 41C16 41 29 25.5 29 16A13 13 0 1 0 3 16C3 25.5 16 41 16 41Z',
    )
    expect(svg).toContain(OBSERVATION_COLOR)
  })

  it('carries the faune/flore pictogram of the reporting form', () => {
    const svg = observationPinSvg()

    expect(svg).toContain('M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20')
  })
})

describe('observationPinLayout', () => {
  it('uses the observation pin image', () => {
    expect(observationPinLayout()?.['icon-image']).toBe(
      OBSERVATION_PIN_IMAGE_ID,
    )
  })

  it('anchors the pin on its tip', () => {
    expect(observationPinLayout()?.['icon-anchor']).toBe('bottom')
  })
})

describe('OBSERVATION_LEGEND', () => {
  it('explains every category the layer can draw', () => {
    expect(OBSERVATION_LEGEND.map((entry) => entry.category)).toEqual([
      ...OBSERVATION_CATEGORIES,
    ])
  })

  it('reuses the colour the pins are drawn with', () => {
    for (const entry of OBSERVATION_LEGEND) {
      expect(entry.color).toBe(OBSERVATION_COLOR)
    }
  })

  it('labels each swatch', () => {
    for (const entry of OBSERVATION_LEGEND) {
      expect(entry.label.trim()).not.toBe('')
    }
  })
})
