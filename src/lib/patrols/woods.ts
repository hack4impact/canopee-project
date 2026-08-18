import type { Coordinate } from './distance'

type WoodedArea = {
  name: string
  south: number
  north: number
  west: number
  east: number
}

export const LAVAL_WOODED_AREAS: readonly WoodedArea[] = [
  {
    name: 'Bois Papineau',
    south: 45.582,
    north: 45.598,
    west: -73.734,
    east: -73.708,
  },
  {
    name: "Bois de l'Équerre",
    south: 45.598,
    north: 45.616,
    west: -73.772,
    east: -73.748,
  },
  {
    name: 'Bois Duvernay',
    south: 45.62,
    north: 45.642,
    west: -73.69,
    east: -73.658,
  },
  {
    name: 'Berge des Baigneurs',
    south: 45.548,
    north: 45.562,
    west: -73.758,
    east: -73.73,
  },
  {
    name: 'Boisé Sainte-Dorothée',
    south: 45.518,
    north: 45.538,
    west: -73.822,
    east: -73.79,
  },
]

function contains(area: WoodedArea, point: Coordinate): boolean {
  return (
    point.latitude >= area.south &&
    point.latitude <= area.north &&
    point.longitude >= area.west &&
    point.longitude <= area.east
  )
}

export function findWoodedArea(points: readonly Coordinate[]): string | null {
  const tally = new Map<string, number>()

  for (const point of points) {
    for (const area of LAVAL_WOODED_AREAS) {
      if (contains(area, point)) {
        tally.set(area.name, (tally.get(area.name) ?? 0) + 1)
      }
    }
  }

  let best: string | null = null
  let bestCount = 0

  for (const [name, count] of tally) {
    if (count > bestCount) {
      best = name
      bestCount = count
    }
  }

  return best
}
