import { requireApprovedAccess } from '@/lib/auth/current-user'
import { createUploadToken } from '@/lib/patrols/upload-token'

/**
 * Hands the native uploader a token scoped to posting patrol points, since it
 * runs outside the WebView and so carries no cookies.
 */
export async function GET() {
  const profile = await requireApprovedAccess('volunteer')

  const token = createUploadToken(profile.id)

  if (!token) {
    return Response.json(
      { error: 'Uploads are not configured.' },
      { status: 503 },
    )
  }

  return Response.json({ token })
}
