import { getCurrentUserProfile } from '@/lib/auth/current-user'
import { canAccess } from '@/lib/auth/roles'
import { toFeatureCollection } from '@/lib/observations/collection'
import { listObservations } from '@/lib/observations/queries'

export async function GET() {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    return Response.json({ error: 'Not signed in.' }, { status: 401 })
  }

  if (!canAccess(profile, 'pro')) {
    return Response.json({ error: 'Insufficient role.' }, { status: 403 })
  }

  const observations = await listObservations()

  return Response.json({
    observations: toFeatureCollection(observations),
  })
}
