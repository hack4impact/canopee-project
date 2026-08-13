'use server'

import { revalidatePath } from 'next/cache'
import { db, patrols } from '@/db'
import { requireApprovedAccess } from '@/lib/auth/current-user'
import { getActivePatrol } from '@/lib/patrols/queries'

export type StartPatrolState = {
  message?: string
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
