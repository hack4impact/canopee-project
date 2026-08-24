import { getCurrentUserProfile } from '@/lib/auth/current-user'
import { canAccess } from '@/lib/auth/roles'
import { getActivePatrol } from '@/lib/patrols/queries'

export async function GET() {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    return Response.json({ error: 'Not signed in.' }, { status: 401 })
  }

  if (!canAccess(profile, 'volunteer')) {
    return Response.json({ error: 'Account not approved.' }, { status: 403 })
  }

  const activePatrol = await getActivePatrol(profile.id)

  return Response.json({
    startedAt: activePatrol?.startedAt.toISOString() ?? null,
  })
}
