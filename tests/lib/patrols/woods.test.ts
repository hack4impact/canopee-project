import { describe, expect, it } from 'vitest'
import {
  buildWoodedAreasFromCollection,
  findWoodedArea,
  LAVAL_WOODED_AREAS,
} from '@/lib/patrols/woods'

const PAPINEAU = { latitude: 45.60348615485863, longitude: -73.68678415957133 }
const PAPINEAU_BOUNDARY = { latitude: 45.597539, longitude: -73.686771 }
const EQUERRE = { latitude: 45.60401867997199, longitude: -73.7620707150088 }
const DOWNTOWN_MONTREAL = { latitude: 45.5017, longitude: -73.5673 }

describe('findWoodedArea', () => {
  it('names the wood the patrol walked through', () => {
    expect(findWoodedArea([PAPINEAU, PAPINEAU])).toBe('Bois Papineau')
  })

  it('matches a point that falls within 100 m of a wood boundary', () => {
    expect(findWoodedArea([PAPINEAU_BOUNDARY])).toBe('Bois Papineau')
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

  it('keeps all wood features from the collection when building the lookup', () => {
    const collection = {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          properties: { NOM: 'Bois Papineau' },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [
              [
                [-73.72, 45.59],
                [-73.72, 45.6],
                [-73.71, 45.6],
                [-73.71, 45.59],
                [-73.72, 45.59],
              ],
            ],
          },
        },
        {
          type: 'Feature' as const,
          properties: { NOM: 'Bois du Parc des Prairies' },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [
              [
                [-73.73, 45.58],
                [-73.73, 45.59],
                [-73.72, 45.59],
                [-73.72, 45.58],
                [-73.73, 45.58],
              ],
            ],
          },
        },
        {
          type: 'Feature' as const,
          properties: { NOM: 'Bois Sainte-Dorothée' },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [
              [
                [-73.74, 45.57],
                [-73.74, 45.58],
                [-73.73, 45.58],
                [-73.73, 45.57],
                [-73.74, 45.57],
              ],
            ],
          },
        },
      ],
    }

    const woodedAreas = buildWoodedAreasFromCollection(collection)

    expect(woodedAreas.map((area) => area.name)).toEqual([
      'Bois Papineau',
      'Bois du Parc des Prairies',
      'Boisé Sainte-Dorothée',
    ])
  })

  it('loads the full set of woods from the imported GeoJSON dataset', () => {
    const names = LAVAL_WOODED_AREAS.map((area) => area.name)

    expect(names).toEqual(
      expect.arrayContaining([
        "Bois de l'Équerre",
        'Bois Papineau',
        'Bois de la Source',
        "L'Orée-des-Bois",
        'Boisé Sainte-Dorothée',
        'Bois du Souvenir',
        'Forêt du 50e',
      ]),
    )
  })
})
