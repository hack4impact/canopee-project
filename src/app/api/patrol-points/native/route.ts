import { db, patrolPoints } from '@/db'
import {
  isAccurateEnough,
  parseNativeLocation,
  parsePatrolPointBatch,
} from '@/lib/patrols/points'
import { getActivePatrol } from '@/lib/patrols/queries'
import { readUploadToken } from '@/lib/patrols/upload-token'

/**
 * Receives a single GPS point posted by the native tracking service. Unlike the
 * batch endpoint this carries no cookies, so it authenticates with a token.
 */
export async function POST(request: Request) {
  const header = request.headers.get('authorization')
  const session = header?.startsWith('Bearer ')
    ? readUploadToken(header.slice('Bearer '.length).trim())
    : null

  if (!session) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const patrol = await getActivePatrol(session.userId)

  if (!patrol) {
    return Response.json({ error: 'No active patrol.' }, { status: 409 })
  }

  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return Response.json({ error: 'Expected a JSON body.' }, { status: 400 })
  }

  const location = parseNativeLocation(payload)

  if (!location) {
    return Response.json({ error: 'Expected a location.' }, { status: 400 })
  }

  // The WebView path drops these client-side, so the native path must too or
  // the same walk records different points depending on which one delivered.
  if (!isAccurateEnough(location.accuracy)) {
    return Response.json({ accepted: 0, dropped: 1 })
  }

  const batch = parsePatrolPointBatch([location.point], {
    patrolStartedAt: patrol.startedAt,
    now: new Date(),
  })

  if ('error' in batch) {
    return Response.json({ error: batch.error }, { status: 400 })
  }

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
