import { describe, expect, it } from 'vitest'
import { FAUNA_COLOR, FLORA_COLOR, observationsPaint } from './layer'

describe('observationsPaint', () => {
  it('colours fauna and flora differently', () => {
    const color = observationsPaint()?.['circle-color'] as unknown[]

    expect(color).toContain(FAUNA_COLOR)
    expect(color).toContain(FLORA_COLOR)
    expect(FAUNA_COLOR).not.toBe(FLORA_COLOR)
  })

  it('grows the circles as the map zooms in', () => {
    const radius = observationsPaint()?.['circle-radius'] as unknown[]
    const near = radius.at(-1) as number
    const far = radius.at(-3) as number

    expect(near).toBeGreaterThan(far)
  })
})
