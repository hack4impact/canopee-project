import { eq } from 'drizzle-orm'
import { db, users } from '@/db'

export type UserProfile = typeof users.$inferSelect

const UNIQUE_VIOLATION = '23505'

function isUniqueViolation(cause: unknown): boolean {
  return (
    typeof cause === 'object' &&
    cause !== null &&
    'code' in cause &&
    cause.code === UNIQUE_VIOLATION
  )
}

function readProfile(authUserId: string) {
  return db
    .select()
    .from(users)
    .where(eq(users.authUserId, authUserId))
    .limit(1)
}

/**
 * Makes sure a Supabase Auth user has a matching `users` row, and hands back
 * the row either way. Signup creates one directly; login runs this for
 * accounts that already exist in Auth only.
 *
 * The returned profile carries `role` and `status`, so the caller can decide
 * where to send the account without a second query.
 */
export async function ensureUserProfile(
  authUserId: string,
  email: string,
): Promise<UserProfile> {
  const [existing] = await readProfile(authUserId)

  if (existing) {
    return existing
  }

  try {
    const [created] = await db
      .insert(users)
      .values({ authUserId, email })
      .returning()

    return created
  } catch (cause) {
    if (!isUniqueViolation(cause)) {
      throw cause
    }

    // Another request inserted the row between the select and the insert.
    // Read back whatever it wrote rather than failing a valid login.
    const [raced] = await readProfile(authUserId)

    if (!raced) {
      throw cause
    }

    return raced
  }
}
