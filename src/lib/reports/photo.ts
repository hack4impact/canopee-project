import { isAcceptedPhotoType } from '@/lib/reports/validation'
import { createClient } from '@/lib/supabase/server'

export const REPORT_PHOTO_BUCKET = 'report-photos'

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function photoExtension(type: string): string | null {
  return isAcceptedPhotoType(type) ? EXTENSIONS[type] : null
}

export const CITIZEN_PHOTO_FOLDER = 'citizen'

export function reportPhotoPath(
  folder: string,
  type: string,
  now: Date,
  random: string,
): string | null {
  const extension = photoExtension(type)

  if (!extension) {
    return null
  }

  return `${folder}/${now.getTime()}-${random}.${extension}`
}

const SIGNED_URL_TTL_SECONDS = 60 * 5

export async function getReportPhotoUrl(path: string): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.storage
    .from(REPORT_PHOTO_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

  if (error || !data) {
    console.error('Failed to sign report photo URL', error)
    return null
  }

  return data.signedUrl
}
