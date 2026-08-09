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

    const [raced] = await readProfile(authUserId)

    if (!raced) {
      throw cause
    }

    return raced
  }
}
