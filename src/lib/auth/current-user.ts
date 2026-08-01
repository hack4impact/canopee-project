import { eq } from 'drizzle-orm'
import { forbidden } from 'next/navigation'
import { db, users } from '@/db'
import { isAdmin } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'

export type UserProfile = typeof users.$inferSelect

/** Loads the signed-in user's application profile, or null when unauthenticated. */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const [profile] = await db
    .select()
    .from(users)
    .where(eq(users.authUserId, user.id))
    .limit(1)

  return profile ?? null
}

/** Ensures the caller is an admin. Throws a 403 response otherwise. */
export async function requireAdmin(): Promise<UserProfile> {
  const profile = await getCurrentUserProfile()

  if (!profile || !isAdmin(profile)) {
    forbidden()
  }

  return profile
}
