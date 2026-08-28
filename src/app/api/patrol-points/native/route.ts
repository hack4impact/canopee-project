import { db, patrolPoints } from '@/db'
import {
  groupPointsByPatrol,
  parseNativeLocationBatch,
  parsePatrolPointBatch,
} from '@/lib/patrols/points'
import { listPatrolsCovering } from '@/lib/patrols/queries'
import { readUploadToken } from '@/lib/patrols/upload-token'

export async function POST(request: Request) {
  const header = request.headers.get('authorization')
  const session = header?.startsWith('Bearer ')
    ? readUploadToken(header.slice('Bearer '.length).trim())
    : null

  if (!session) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return Response.json({ error: 'Expected a JSON body.' }, { status: 400 })
  }

  const parsed = parseNativeLocationBatch(payload)

  if ('error' in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 })
  }

  if (parsed.locations.length === 0) {
    return Response.json({ accepted: 0, dropped: parsed.dropped })
  }

  const points = parsed.locations.map((location) => location.point)
  const recordedAt = points.map((point) => Date.parse(point.recordedAt))
  const now = new Date()

  const windows = await listPatrolsCovering(
    session.userId,
    new Date(Math.min(...recordedAt)),
    new Date(Math.max(...recordedAt)),
  )

  if (windows.length === 0) {
    return Response.json({ error: 'No matching patrol.' }, { status: 409 })
  }

  const { groups, dropped } = groupPointsByPatrol(points, windows, now)

  let accepted = 0
  let unusable = parsed.dropped + dropped

  for (const group of groups) {
    const batch = parsePatrolPointBatch(group.points, {
      patrolStartedAt: group.startedAt,
      now,
    })

    if ('error' in batch) {
      unusable += group.points.length
      continue
    }

    unusable += batch.dropped

    if (batch.points.length === 0) {
      continue
    }

    await db
      .insert(patrolPoints)
      .values(
        batch.points.map((point) => ({ ...point, patrolId: group.patrolId })),
      )
      .onConflictDoNothing()

    accepted += batch.points.length
  }

  return Response.json({ accepted, dropped: unusable })
}
