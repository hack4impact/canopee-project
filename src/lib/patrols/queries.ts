import { and, desc, eq, isNull } from 'drizzle-orm'
import { db, patrols } from '@/db'

export type Patrol = typeof patrols.$inferSelect

/** The user's running patrol, or null. A null `endedAt` is what makes it active. */
export async function getActivePatrol(userId: string): Promise<Patrol | null> {
  const [patrol] = await db
    .select()
    .from(patrols)
    .where(and(eq(patrols.userId, userId), isNull(patrols.endedAt)))
    .orderBy(desc(patrols.startedAt))
    .limit(1)

  return patrol ?? null
}
