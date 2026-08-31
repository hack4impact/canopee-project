import { db, patrolPoints } from '@/db'
import { requireApprovedAccess } from '@/lib/auth/current-user'
import { parsePatrolPointBatch } from '@/lib/patrols/points'
import { getActivePatrol } from '@/lib/patrols/queries'

/**
 * Receives a batch of GPS points from a running patrol. A Route Handler rather
 * than a Server Action.
 */
export async function POST(request: Request) {
  const profile = await requireApprovedAccess('volunteer')

  // The patrol comes from the session, never from the body.
  const patrol = await getActivePatrol(profile.id)

  if (!patrol) {
    return Response.json({ error: 'No active patrol.' }, { status: 409 })
  }

  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return Response.json({ error: 'Expected a JSON body.' }, { status: 400 })
  }

  const batch = parsePatrolPointBatch(payload, {
    patrolStartedAt: patrol.startedAt,
    now: new Date(),
  })

  if ('error' in batch) {
    return Response.json({ error: batch.error }, { status: 400 })
  }

  if (batch.dropped > 0) {
    console.warn(
      `Dropped ${batch.dropped} unusable point(s) for patrol ${patrol.id}`,
    )
  }

  // A failing insert is left to throw: the 500 tells the client to keep its
  // buffer and try again, which a caught error would not.
  if (batch.points.length > 0) {
    await db
      .insert(patrolPoints)
      .values(batch.points.map((point) => ({ ...point, patrolId: patrol.id })))
      .onConflictDoNothing()
  }

  return Response.json({
    accepted: batch.points.length,
    dropped: batch.dropped,
  })
}
