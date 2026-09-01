import {
  isReportCategory,
  isReportTypology,
  reportGroupOfCategory,
  REPORT_UNITS,
} from '@/lib/reports/categories'

export const MAX_DESCRIPTION_LENGTH = 500

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024

export const MAX_SPECIES_LENGTH = 200

export const MAX_HABITAT_LENGTH = 200

export const MAX_QUANTITY = 1_000_000

export const ACCEPTED_PHOTO_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export type ReportInput = {
  category: string
  description: string
  latitude: number | null
  longitude: number | null
  typology?: string
  quantity?: string
  species?: string
  unit?: string
  habitat?: string
}

export type ReportPhotoInput = {
  size: number
  type: string
}

export type ReportErrors = Partial<
  Record<keyof ReportInput | 'photo' | 'reporterEmail', string>
>

export function validateReport(input: ReportInput): ReportErrors {
  const errors: ReportErrors = {}

  if (!input.category) {
    errors.category = 'Choisissez une catégorie.'
  } else if (!isReportCategory(input.category)) {
    errors.category = 'Cette catégorie n’existe pas.'
  }

  const description = input.description.trim()

  if (!description) {
    errors.description = 'Décrivez ce que vous avez observé.'
  } else if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Utilisez au plus ${MAX_DESCRIPTION_LENGTH} caractères.`
  }

  if (
    !isCoordinate(input.latitude, 90) ||
    !isCoordinate(input.longitude, 180)
  ) {
    errors.latitude =
      'Une position est nécessaire pour situer le signalement. Autorisez la localisation, ou placez le repère sur la carte.'
  }

  if (isReportCategory(input.category)) {
    const group = reportGroupOfCategory(input.category)

    if (group === 'entretien') {
      validateTypology(input.typology, errors)
    }

    if (group === 'faune_flore') {
      validateSpecies(input.species, errors)
    }

    if (group === 'citoyen' || group === 'faune_flore') {
      validateQuantity(input.quantity, errors)
    }

    if (group === 'faune_flore') {
      validateUnit(input.unit, errors)
      validateHabitat(input.habitat, errors)
    }
  }

  return errors
}

function validateTypology(value: string | undefined, errors: ReportErrors) {
  if (!value) {
    errors.typology = 'Choisissez la typologie.'
  } else if (!isReportTypology(value)) {
    errors.typology = 'Cette typologie n’existe pas.'
  }
}

function validateSpecies(value: string | undefined, errors: ReportErrors) {
  const species = value?.trim()

  if (!species) {
    errors.species = 'Précisez l’espèce observée.'
  } else if (species.length > MAX_SPECIES_LENGTH) {
    errors.species = `Utilisez au plus ${MAX_SPECIES_LENGTH} caractères.`
  }
}

function validateQuantity(value: string | undefined, errors: ReportErrors) {
  if (!value || value.trim() === '') {
    return
  }

  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_QUANTITY) {
    errors.quantity = 'Indiquez un nombre entier positif.'
  }
}

function validateUnit(value: string | undefined, errors: ReportErrors) {
  if (!value || value.trim() === '') {
    return
  }

  if (!(REPORT_UNITS as readonly string[]).includes(value.trim())) {
    errors.unit = 'Cette unité n’existe pas.'
  }
}

function validateHabitat(value: string | undefined, errors: ReportErrors) {
  const habitat = value?.trim()

  if (habitat && habitat.length > MAX_HABITAT_LENGTH) {
    errors.habitat = `Utilisez au plus ${MAX_HABITAT_LENGTH} caractères.`
  }
}

export function validatePhoto(photo: ReportPhotoInput | null): string | null {
  if (!photo || photo.size === 0) {
    return null
  }

  if (!isAcceptedPhotoType(photo.type)) {
    return 'Formats acceptés : JPEG, PNG ou WebP.'
  }

  if (photo.size > MAX_PHOTO_BYTES) {
    return `La photo dépasse ${Math.round(MAX_PHOTO_BYTES / 1024 / 1024)} Mo.`
  }

  return null
}

export function isAcceptedPhotoType(type: string): boolean {
  return (ACCEPTED_PHOTO_TYPES as readonly string[]).includes(type)
}

export function isValidReport(errors: ReportErrors): boolean {
  return Object.keys(errors).length === 0
}

function isCoordinate(value: number | null, limit: number): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Math.abs(value) <= limit
  )
}
