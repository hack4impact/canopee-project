'use server'

import { asc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db, patrolPoints, patrols } from '@/db'
import { requireApprovedAccess } from '@/lib/auth/current-user'
import { totalDistanceMetres } from '@/lib/patrols/distance'
import { getActivePatrol } from '@/lib/patrols/queries'

export type StartPatrolState = {
  message?: string
}

export type PatrolSummary = {
  id: string
  startedAt: string
  endedAt: string
  durationSeconds: number
  distanceMetres: number
}

export type EndPatrolState = {
  message?: string
  summary?: PatrolSummary
}

/** Opens a patrol. Timestamps are left to the database, not the phone's clock. */
export async function startPatrol(): Promise<StartPatrolState> {
  // A Server Action is a POST endpoint, so hiding the button is not the gate.
  const profile = await requireApprovedAccess('volunteer')

  // At most one active patrol per user.
  const active = await getActivePatrol(profile.id)

  if (active) {
    revalidatePath('/carte')
    return {}
  }

  try {
    await db.insert(patrols).values({ userId: profile.id })
  } catch (cause) {
    console.error('Failed to open a patrol row', cause)

    return { message: 'Impossible de démarrer la patrouille. Réessayez.' }
  }

  revalidatePath('/carte')

  return {}
}

/** Closes the patrol and records the distance walked over its stored route. */
export async function endPatrol(): Promise<EndPatrolState> {
  const profile = await requireApprovedAccess('volunteer')

  const active = await getActivePatrol(profile.id)

  if (!active) {
    revalidatePath('/carte')
    return {}
  }

  const endedAt = new Date()
  let summary: PatrolSummary | undefined

  try {
    // Read after the client has flushed, so the distance covers the whole route.
    const points = await db
      .select({
        latitude: patrolPoints.latitude,
        longitude: patrolPoints.longitude,
      })
      .from(patrolPoints)
      .where(eq(patrolPoints.patrolId, active.id))
      .orderBy(asc(patrolPoints.recordedAt))

    const distanceMeters = Math.round(
      totalDistanceMetres(
        points.map((point) => ({
          latitude: Number(point.latitude),
          longitude: Number(point.longitude),
        })),
      ),
    )

    await db
      .update(patrols)
      .set({ endedAt, distanceMeters })
      .where(eq(patrols.id, active.id))

    summary = {
      id: active.id,
      startedAt: active.startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationSeconds: Math.round(
        (endedAt.getTime() - active.startedAt.getTime()) / 1000,
      ),
      distanceMetres: distanceMeters,
    }
  } catch (cause) {
    console.error('Failed to close the patrol', cause)

    return { message: 'Impossible de terminer la patrouille. Réessayez.' }
  }

  revalidatePath('/carte')

  return { summary }
}
