'use server'

import { db, reports } from '@/db'
import { requireApprovedAccess } from '@/lib/auth/current-user'
import { isReportCategory } from '@/lib/reports/categories'
import { REPORT_PHOTO_BUCKET, reportPhotoPath } from '@/lib/reports/photo'
import {
  isValidReport,
  validatePhoto,
  validateReport,
  type ReportErrors,
} from '@/lib/reports/validation'
import { createClient } from '@/lib/supabase/server'

const COORDINATE_SCALE = 6

export type ReportFormState = {
  message?: string
  errors?: ReportErrors
  submittedId?: string
}

function parseCoordinate(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null
  }

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

function readPhoto(formData: FormData): File | null {
  const photo = formData.get('photo')

  if (!(photo instanceof File) || photo.size === 0) {
    return null
  }

  return photo
}

export async function submitReport(
  _prevState: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  const profile = await requireApprovedAccess('volunteer')

  const input = {
    category: String(formData.get('category') ?? ''),
    description: String(formData.get('description') ?? ''),
    latitude: parseCoordinate(formData.get('latitude')),
    longitude: parseCoordinate(formData.get('longitude')),
    typology: String(formData.get('typology') ?? ''),
    quantity: String(formData.get('quantity') ?? ''),
    species: String(formData.get('species') ?? ''),
    unit: String(formData.get('unit') ?? ''),
    habitat: String(formData.get('habitat') ?? ''),
  }

  const errors = validateReport(input)
  const photo = readPhoto(formData)
  const photoError = validatePhoto(photo)

  if (photoError) {
    errors.photo = photoError
  } else if (!photo && profile.role !== 'admin') {
    // photo required for volunteers and pros, optional for admins.
    errors.photo =
      'Une photo est requise pour ce type de signalement. Ajoutez-la, puis réessayez.'
  }

  if (!isValidReport(errors)) {
    return { errors }
  }

  if (
    !isReportCategory(input.category) ||
    input.latitude === null ||
    input.longitude === null
  ) {
    return { errors }
  }

  let photoPath: string | null = null

  if (photo) {
    photoPath = await uploadPhoto(profile.authUserId, photo)

    if (!photoPath) {
      return {
        message:
          'La photo n’a pas pu être téléversée. Réessayez, ou envoyez le signalement sans photo.',
      }
    }
  }

  try {
    const [created] = await db
      .insert(reports)
      .values({
        userId: profile.id,
        category: input.category,
        description: input.description.trim(),
        typology: input.typology.trim() || null,
        quantity: parseQuantity(input.quantity),
        species: input.species.trim() || null,
        unit: input.unit.trim() || null,
        habitat: input.habitat.trim() || null,
        photoUrl: photoPath,
        latitude: input.latitude.toFixed(COORDINATE_SCALE),
        longitude: input.longitude.toFixed(COORDINATE_SCALE),
      })
      .returning({ id: reports.id })

    return { submittedId: created.id }
  } catch (cause) {
    console.error('Failed to insert a report row', cause)

    return {
      message: 'Impossible d’enregistrer le signalement. Réessayez.',
    }
  }
}

function parseQuantity(value: string): number | null {
  if (value.trim() === '') {
    return null
  }

  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null
}

async function uploadPhoto(
  authUserId: string,
  photo: File,
): Promise<string | null> {
  const path = reportPhotoPath(
    authUserId,
    photo.type,
    new Date(),
    crypto.randomUUID(),
  )

  if (!path) {
    return null
  }

  try {
    const supabase = await createClient()

    const { error } = await supabase.storage
      .from(REPORT_PHOTO_BUCKET)
      .upload(path, photo, { contentType: photo.type, upsert: false })

    if (error) {
      console.error('Report photo upload failed', error)
      return null
    }

    return path
  } catch (cause) {
    console.error('Report photo upload threw', cause)
    return null
  }
}
