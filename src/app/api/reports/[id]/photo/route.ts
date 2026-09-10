import { getCurrentUserProfile } from '@/lib/auth/current-user'
import { canAccess } from '@/lib/auth/roles'
import { getReportPhotoUrl } from '@/lib/reports/photo'
import { getReportPhotoPath } from '@/lib/reports/queries'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    return Response.json({ error: 'Not signed in.' }, { status: 401 })
  }

  if (!canAccess(profile, 'volunteer')) {
    return Response.json({ error: 'Account not approved.' }, { status: 403 })
  }

  const { id } = await params

  if (!UUID_PATTERN.test(id)) {
    return Response.json({ error: 'Report not found.' }, { status: 404 })
  }

  const path = await getReportPhotoPath(id)

  if (!path) {
    return Response.json({ error: 'Report not found.' }, { status: 404 })
  }

  const url = await getReportPhotoUrl(path)

  if (!url) {
    return Response.json({ error: 'Photo unavailable.' }, { status: 502 })
  }

  return Response.json({ url })
}
