import { describe, expect, it } from 'vitest'
import {
  isValidReport,
  MAX_DESCRIPTION_LENGTH,
  MAX_PHOTO_BYTES,
  validatePhoto,
  validateReport,
  type ReportInput,
} from './validation'

const LAVAL: Pick<ReportInput, 'latitude' | 'longitude'> = {
  latitude: 45.5871,
  longitude: -73.723,
}

function input(overrides: Partial<ReportInput> = {}): ReportInput {
  return {
    category: 'dangerous_tree',
    description: 'Grosse branche cassée au-dessus du sentier.',
    typology: 'probleme_observe',
    ...LAVAL,
    ...overrides,
  }
}

describe('validateReport', () => {
  it('accepts a complete Entretien report', () => {
    expect(isValidReport(validateReport(input()))).toBe(true)
  })

  it('accepts a complete Citoyen report without a count', () => {
    expect(
      isValidReport(
        validateReport(
          input({ category: 'unleashed_dog', typology: undefined }),
        ),
      ),
    ).toBe(true)
  })

  it('accepts a complete Faune/flore report', () => {
    expect(
      isValidReport(
        validateReport(
          input({
            category: 'fauna_observation',
            typology: undefined,
            species: 'Salamandre sombre du Nord',
          }),
        ),
      ),
    ).toBe(true)
  })

  it('requires a typology for Entretien reports', () => {
    expect(
      validateReport(input({ typology: undefined })).typology,
    ).toBeDefined()
    expect(
      validateReport(input({ typology: 'nimporte_quoi' })).typology,
    ).toBeDefined()
  })

  it('does not require a typology outside Entretien', () => {
    const errors = validateReport(
      input({ category: 'unleashed_dog', typology: undefined }),
    )

    expect(errors.typology).toBeUndefined()
  })

  it('requires a species for Faune/flore reports', () => {
    expect(
      validateReport(
        input({ category: 'flora_observation', typology: undefined }),
      ).species,
    ).toBeDefined()
  })

  it('rejects an over-long species', () => {
    const errors = validateReport(
      input({
        category: 'fauna_observation',
        typology: undefined,
        species: 'a'.repeat(201),
      }),
    )

    expect(errors.species).toBeDefined()
  })

  it('accepts an empty count for Citoyen reports', () => {
    const errors = validateReport(
      input({ category: 'unleashed_dog', typology: undefined, quantity: '' }),
    )

    expect(errors.quantity).toBeUndefined()
  })

  it('rejects a non-integer or negative count', () => {
    expect(
      validateReport(
        input({
          category: 'unleashed_dog',
          typology: undefined,
          quantity: '2.5',
        }),
      ).quantity,
    ).toBeDefined()
    expect(
      validateReport(
        input({
          category: 'unleashed_dog',
          typology: undefined,
          quantity: '-3',
        }),
      ).quantity,
    ).toBeDefined()
  })

  it('accepts a positive integer count', () => {
    const errors = validateReport(
      input({ category: 'unleashed_dog', typology: undefined, quantity: '4' }),
    )

    expect(errors.quantity).toBeUndefined()
  })

  it('rejects a count over the cap', () => {
    expect(
      validateReport(
        input({
          category: 'unleashed_dog',
          typology: undefined,
          quantity: '1000001',
        }),
      ).quantity,
    ).toBeDefined()
  })

  it('rejects an unknown unit for Faune/flore', () => {
    expect(
      validateReport(
        input({
          category: 'fauna_observation',
          typology: undefined,
          species: 'Oiseau',
          unit: 'tonnes',
        }),
      ).unit,
    ).toBeDefined()
  })

  it('rejects a missing category', () => {
    expect(validateReport(input({ category: '' })).category).toBeDefined()
  })

  it('rejects a category outside the database enum', () => {
    expect(
      validateReport(input({ category: 'sasquatch_sighting' })).category,
    ).toBeDefined()
  })

  it('rejects an empty description', () => {
    expect(
      validateReport(input({ description: '   ' })).description,
    ).toBeDefined()
  })

  it('measures the description after trimming', () => {
    const description = `${'a'.repeat(MAX_DESCRIPTION_LENGTH)}   `

    expect(validateReport(input({ description })).description).toBeUndefined()
  })

  it('rejects a description over the limit', () => {
    const description = 'a'.repeat(MAX_DESCRIPTION_LENGTH + 1)

    expect(validateReport(input({ description })).description).toBeDefined()
  })

  it('rejects a report with no fix yet', () => {
    expect(validateReport(input({ latitude: null })).latitude).toBeDefined()
    expect(validateReport(input({ longitude: null })).latitude).toBeDefined()
  })

  it('rejects coordinates outside the decimal(9, 6) range', () => {
    expect(validateReport(input({ latitude: 91 })).latitude).toBeDefined()
    expect(validateReport(input({ longitude: -181 })).latitude).toBeDefined()
    expect(
      validateReport(input({ latitude: Number.NaN })).latitude,
    ).toBeDefined()
  })

  it('accepts the null island, which is a valid coordinate', () => {
    const errors = validateReport(input({ latitude: 0, longitude: 0 }))

    expect(errors.latitude).toBeUndefined()
  })
})

describe('validatePhoto', () => {
  it('accepts no photo, because a photo is optional', () => {
    expect(validatePhoto(null)).toBeNull()
  })

  it('accepts an empty file, which is what an untouched input submits', () => {
    expect(
      validatePhoto({ size: 0, type: 'application/octet-stream' }),
    ).toBeNull()
  })

  it('accepts the formats the browser downscale step produces', () => {
    expect(validatePhoto({ size: 1024, type: 'image/jpeg' })).toBeNull()
    expect(validatePhoto({ size: 1024, type: 'image/png' })).toBeNull()
    expect(validatePhoto({ size: 1024, type: 'image/webp' })).toBeNull()
  })

  it('rejects a non-image', () => {
    expect(validatePhoto({ size: 1024, type: 'application/pdf' })).toBeTruthy()
  })

  it('rejects HEIC, which most browsers cannot render', () => {
    expect(validatePhoto({ size: 1024, type: 'image/heic' })).toBeTruthy()
  })

  it('rejects a file over the size cap', () => {
    expect(
      validatePhoto({ size: MAX_PHOTO_BYTES + 1, type: 'image/jpeg' }),
    ).toBeTruthy()
  })

  it('accepts a file exactly on the cap', () => {
    expect(
      validatePhoto({ size: MAX_PHOTO_BYTES, type: 'image/jpeg' }),
    ).toBeNull()
  })
})
