import { describe, expect, it } from 'vitest'
import { findWoodedArea } from './woods'

const PAPINEAU = { latitude: 45.5895, longitude: -73.7225 }
const EQUERRE = { latitude: 45.6058, longitude: -73.7634 }
const DOWNTOWN_MONTREAL = { latitude: 45.5017, longitude: -73.5673 }

describe('findWoodedArea', () => {
  it('names the wood the patrol walked through', () => {
    expect(findWoodedArea([PAPINEAU, PAPINEAU])).toBe('Bois Papineau')
  })

  it('is null when the patrol stayed outside every known wood', () => {
    expect(findWoodedArea([DOWNTOWN_MONTREAL])).toBeNull()
  })

  it('is null without any point', () => {
    expect(findWoodedArea([])).toBeNull()
  })

  it('picks the wood holding most of the route', () => {
    const points = [EQUERRE, EQUERRE, EQUERRE, PAPINEAU]

    expect(findWoodedArea(points)).toBe("Bois de l'Équerre")
  })

  it('ignores points that wander out of the woods', () => {
    const points = [DOWNTOWN_MONTREAL, PAPINEAU, DOWNTOWN_MONTREAL]

    expect(findWoodedArea(points)).toBe('Bois Papineau')
  })
})
