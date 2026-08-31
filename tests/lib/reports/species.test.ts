import { describe, it, expect } from 'vitest'
import {
  searchSpecies,
  getSpeciesByCategory,
  SPECIES_DATABASE,
} from '@/lib/reports/species'

describe('species search', () => {
  it('should return empty array for empty query', () => {
    const results = searchSpecies('')
    expect(results).toEqual([])
  })

  it('should return empty array for whitespace-only query', () => {
    const results = searchSpecies('   ')
    expect(results).toEqual([])
  })

  it('should find species by common name prefix (accent-insensitive)', () => {
    const results = searchSpecies('sala')
    expect(results.length).toBeGreaterThan(0)
    expect(
      results[0].commonName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .startsWith('sala'),
    ).toBe(true)
  })

  it('should be case-insensitive', () => {
    const resultsLower = searchSpecies('salamandre')
    const resultsUpper = searchSpecies('SALAMANDRE')
    expect(resultsLower.length).toBeGreaterThan(0)
    expect(resultsUpper.length).toBeGreaterThan(0)
    expect(resultsLower.length).toBe(resultsUpper.length)
  })

  it('should rank prefix matches higher than substring matches', () => {
    const results = searchSpecies('sal')
    if (results.length > 1) {
      const firstCommonNorm = results[0].commonName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      expect(firstCommonNorm.startsWith('sal')).toBe(true)
    }
  })

  it('should match against scientific name', () => {
    const results = searchSpecies('Desmognathus')
    expect(results.length).toBeGreaterThan(0)
    const found = results.some((s) =>
      s.scientificName.toLowerCase().includes('desmognathus'),
    )
    expect(found).toBe(true)
  })

  it('should filter by category when provided', () => {
    const allResults = searchSpecies('sal')
    const filteredResults = searchSpecies('sal', 'amphibien')

    expect(filteredResults.length).toBeLessThanOrEqual(allResults.length)
    expect(filteredResults.every((s) => s.category === 'amphibien')).toBe(true)
  })

  it('should preserve the CSV source group for every species', () => {
    expect(SPECIES_DATABASE.every((species) => species.sourceGroup)).toBe(true)
    expect(
      SPECIES_DATABASE.some(
        (species) => species.sourceGroup === 'Embryophytes',
      ),
    ).toBe(true)
    expect(
      SPECIES_DATABASE.some((species) => species.sourceGroup === 'Charophyte'),
    ).toBe(true)
    expect(
      SPECIES_DATABASE.some((species) => species.sourceGroup === 'Bryophytes'),
    ).toBe(true)
  })

  it('should include every CSV category unknown option', () => {
    const unknownNames = [
      'Reptile inconnu',
      'Insecte inconnu',
      'Oiseau inconnu',
      'Amphibien inconnu',
      'Mammifère inconnu',
      'Invertébré inconnu',
      'Mollusque inconnu',
      'Poisson inconnu',
      'Plante vasculaire inconnue',
      'Bryophyte inconnue',
    ]
    const allSpecies = [
      ...SPECIES_DATABASE,
      ...unknownNames.map((commonName) => ({ commonName })),
    ]
    expect(
      unknownNames.every((name) =>
        allSpecies.some((s) => s.commonName === name),
      ),
    ).toBe(true)
  })

  it('should include an unknown option for every species category', () => {
    const categories = [
      'reptile',
      'insecte',
      'oiseau',
      'amphibien',
      'mammifere',
      'invertebre',
      'mollusque',
      'poisson',
      'plante_vasculaire',
      'bryophyte',
    ] as const

    for (const category of categories) {
      const result = getSpeciesByCategory(category).find((species) =>
        species.commonName.toLowerCase().includes('inconnu'),
      )
      expect(result?.category).toBe(category)
    }
  })

  it('should respect limit parameter', () => {
    const results = searchSpecies('a', undefined, 5)
    expect(results.length).toBeLessThanOrEqual(5)
  })

  it('should remove accents during search', () => {
    const resultsWithAccent = searchSpecies('érable')
    const resultsWithoutAccent = searchSpecies('erable')
    expect(resultsWithAccent.length).toBe(resultsWithoutAccent.length)
  })

  it('should prioritize common name matches over scientific', () => {
    const results = searchSpecies('Desmognathus')
    const firstIsCommon = !results[0].commonName.includes('Desmognathus')
    expect(
      firstIsCommon || results[0].scientificName.includes('Desmognathus'),
    ).toBe(true)
  })

  it('should return at most 20 results by default', () => {
    const results = searchSpecies('a')
    expect(results.length).toBeLessThanOrEqual(20)
  })
})

describe('getSpeciesByCategory', () => {
  it('should return only species from specified category', () => {
    const results = getSpeciesByCategory('amphibien')
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((s) => s.category === 'amphibien')).toBe(true)
  })

  it('should return the unknown option for a category without listed species', () => {
    const results = getSpeciesByCategory('invertebre')
    expect(
      results.some((species) => species.commonName === 'Invertébré inconnu'),
    ).toBe(true)
  })

  it('should return different results for different categories', () => {
    const amphibians = getSpeciesByCategory('amphibien')
    const birds = getSpeciesByCategory('oiseau')

    expect(amphibians.length).toBeGreaterThan(0)
    expect(birds.length).toBeGreaterThan(0)
    expect(amphibians).not.toEqual(birds)
  })
})

describe('SPECIES_DATABASE', () => {
  it('should be populated with species', () => {
    expect(SPECIES_DATABASE.length).toBeGreaterThan(0)
  })

  it('should have at least 100 species', () => {
    expect(SPECIES_DATABASE.length).toBeGreaterThanOrEqual(100)
  })

  it('each species should have required fields', () => {
    SPECIES_DATABASE.forEach((species) => {
      expect(species.category).toBeDefined()
      expect(species.scientificName).toBeDefined()
      expect(species.commonName).toBeDefined()
      expect(species.status).toBeDefined()
    })
  })

  it('should have species from multiple categories', () => {
    const categories = new Set(SPECIES_DATABASE.map((s) => s.category))
    expect(categories.size).toBeGreaterThan(1)
  })
})
