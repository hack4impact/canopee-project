import { sql } from 'drizzle-orm'
import { db } from '@/db'
import { mapLoadCounters } from '@/db/schema'
import { getMonthKey } from '@/lib/mapbox'

export async function POST() {
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
