import { getCurrentUserProfile } from '@/lib/auth/current-user'
import { canAccess } from '@/lib/auth/roles'
import { canViewPatrol } from '@/lib/patrols/access'
import { getPatrolById, listPatrolRoute } from '@/lib/patrols/queries'

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
    return Response.json({ error: 'Patrol not found.' }, { status: 404 })
  }

  const patrol = await getPatrolById(id)

  if (!patrol) {
    return Response.json({ error: 'Patrol not found.' }, { status: 404 })
  }

  if (!canViewPatrol(profile, patrol)) {
    return Response.json(
      { error: 'You can only view your own patrols.' },
      { status: 403 },
    )
  }

  const points = await listPatrolRoute(patrol.id)

  return Response.json({
    patrolId: patrol.id,
    points: points.map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
      recordedAt: point.recordedAt.toISOString(),
    })),
  })
}
