import { sql } from 'drizzle-orm'
import { db } from '@/db'
import { mapLoadCounters } from '@/db/schema'
import { getCurrentUserProfile } from '@/lib/auth/current-user'
import { canAccess } from '@/lib/auth/roles'
import { getMonthKey } from '@/lib/mapbox'

export async function POST() {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    return Response.json({ error: 'Not signed in.' }, { status: 401 })
  }

  if (!canAccess(profile, 'volunteer')) {
    return Response.json({ error: 'Account not approved.' }, { status: 403 })
  }

  const month = getMonthKey(new Date())

  await db
    .insert(mapLoadCounters)
    .values({ month, count: 1 })
    .onConflictDoUpdate({
      target: mapLoadCounters.month,
      set: {
        count: sql`${mapLoadCounters.count} + 1`,
        updatedAt: new Date(),
      },
    })

  return new Response(null, { status: 204 })
}
