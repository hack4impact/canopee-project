import { createClient as createAdminClient } from '@supabase/supabase-js'
import { db, reports } from '@/db'
import type { UserProfile } from '@/lib/auth/current-user'
import { isReportCategory } from '@/lib/reports/categories'
import {
  CITIZEN_PHOTO_FOLDER,
  REPORT_PHOTO_BUCKET,
  reportPhotoPath,
} from '@/lib/reports/photo'
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
  queued?: boolean
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function readReportId(formData: FormData): string | null {
  const id = formData.get('id')

  if (typeof id !== 'string' || !UUID.test(id)) {
    return null
  }

  return id
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

function parseQuantity(value: string): number | null {
  if (value.trim() === '') {
    return null
  }

  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null
}

export type Reporter =
  { kind: 'user'; profile: UserProfile } | { kind: 'citizen'; email: string }

async function uploadPhoto(
  reporter: Reporter,
  photo: File,
): Promise<string | null> {
  const folder =
    reporter.kind === 'user'
      ? reporter.profile.authUserId
      : CITIZEN_PHOTO_FOLDER

  const path = reportPhotoPath(
    folder,
    photo.type,
    new Date(),
    crypto.randomUUID(),
  )

  if (!path) {
    return null
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (reporter.kind === 'citizen' && (!supabaseUrl || !serviceKey)) {
    console.error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured: a citizen photo cannot be stored',
    )
    return null
  }

  try {
    const supabase =
      reporter.kind === 'user'
        ? await createClient()
        : createAdminClient(supabaseUrl as string, serviceKey as string, {
            auth: { autoRefreshToken: false, persistSession: false },
          })

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

export async function createReport(
  profile: UserProfile,
  formData: FormData,
): Promise<ReportFormState> {
  return submitReport({ kind: 'user', profile }, formData)
}

export async function createCitizenReport(
  email: string,
  formData: FormData,
): Promise<ReportFormState> {
  return submitReport({ kind: 'citizen', email }, formData)
}

async function submitReport(
  reporter: Reporter,
  formData: FormData,
): Promise<ReportFormState> {
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
    statut: String(formData.get('statut') ?? ''),
  }

  const errors = validateReport(input)
  const photo = readPhoto(formData)
  const photoError = validatePhoto(photo)

  if (photoError) {
    errors.photo = photoError
  } else if (
    !photo &&
    reporter.kind === 'user' &&
    reporter.profile.role !== 'admin'
  ) {
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
    photoPath = await uploadPhoto(reporter, photo)

    if (!photoPath) {
      return {
        message:
          'La photo n’a pas pu être téléversée. Réessayez, ou envoyez le signalement sans photo.',
      }
    }
  }

  const id = readReportId(formData)

  try {
    const [created] = await db
      .insert(reports)
      .values({
        ...(id ? { id } : {}),
        ...(reporter.kind === 'user'
          ? { userId: reporter.profile.id }
          : { reporterEmail: reporter.email }),
        category: input.category,
        description: input.description.trim(),
        typology: input.typology.trim() || null,
        quantity: parseQuantity(input.quantity),
        species: input.species.trim() || null,
        unit: input.unit.trim() || null,
        habitat: input.habitat.trim() || null,
        statut: input.statut.trim() || null,
        photoUrl: photoPath,
        latitude: input.latitude.toFixed(COORDINATE_SCALE),
        longitude: input.longitude.toFixed(COORDINATE_SCALE),
      })
      .onConflictDoNothing()
      .returning({ id: reports.id })

    return { submittedId: created?.id ?? id ?? undefined }
  } catch (cause) {
    console.error('Failed to insert a report row', cause)

    return {
      message: 'Impossible d’enregistrer le signalement. Réessayez.',
    }
  }
}
