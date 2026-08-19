import { isAcceptedPhotoType } from '@/lib/reports/validation'

export const REPORT_PHOTO_BUCKET = 'report-photos'

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function photoExtension(type: string): string | null {
  return isAcceptedPhotoType(type) ? EXTENSIONS[type] : null
}

export function reportPhotoPath(
  authUserId: string,
  type: string,
  now: Date,
  random: string,
): string | null {
  const extension = photoExtension(type)

  if (!extension) {
    return null
  }

  return `${authUserId}/${now.getTime()}-${random}.${extension}`
}
