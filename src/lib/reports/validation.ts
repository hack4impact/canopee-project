import { isReportCategory } from '@/lib/reports/categories'

export const MAX_DESCRIPTION_LENGTH = 500

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024

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
}

export type ReportPhotoInput = {
  size: number
  type: string
}

export type ReportErrors = Partial<Record<keyof ReportInput | 'photo', string>>

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
      'Votre position est nécessaire pour situer le signalement. Autorisez la localisation, puis réessayez.'
  }

  return errors
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
