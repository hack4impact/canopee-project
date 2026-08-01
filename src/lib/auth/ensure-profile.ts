import { eq } from 'drizzle-orm'
import { db, users } from '@/db'

const UNIQUE_VIOLATION = '23505'

function isUniqueViolation(cause: unknown): boolean {
  return (
    typeof cause === 'object' &&
    cause !== null &&
    'code' in cause &&
    cause.code === UNIQUE_VIOLATION
  )
}

/**
 * Makes sure a Supabase Auth user has a matching `users` row. Signup creates
 * one directly; login runs this for accounts that already exist in Auth only.
 */
export async function ensureUserProfile(
  authUserId: string,
  email: string,
): Promise<void> {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.authUserId, authUserId))
    .limit(1)

  if (existing) {
    return
  }

  try {
    await db.insert(users).values({ authUserId, email })
  } catch (cause) {
    if (!isUniqueViolation(cause)) {
      throw cause
    }
  }
}
