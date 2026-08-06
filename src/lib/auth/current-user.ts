import { eq } from 'drizzle-orm'
import { forbidden, redirect } from 'next/navigation'
import { db, users } from '@/db'
import { canAccess, isAdmin, isApproved, type Role } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'

export type UserProfile = typeof users.$inferSelect

/** Loads the signed-in user's application profile, or null when unauthenticated (or when the profile row is missing). */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
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
  } catch (error) {
    console.warn('Unable to resolve the current user profile:', error)
    return null
  }
}

/** Ensures the caller is an admin. Throws a 403 response otherwise. */
export async function requireAdmin(): Promise<UserProfile> {
  const profile = await getCurrentUserProfile()

  if (!profile || !isAdmin(profile)) {
    forbidden()
  }

  return profile
}

/**
 * Page and layout gate. Sends signed-out visitors to the login form and
 * signed-in-but-unapproved accounts to the approval-pending screen, which
 * explains why they can't get in. Anyone signed in and approved but holding
 * too low a role gets a 403 instead — they know where they stand, they just
 * aren't allowed here.
 *
 * Use this from a layout or page. Route Handlers and Server Actions should
 * call `requireApprovedAccess` so a rejected request gets a status code
 * rather than a redirect to an HTML page.
 */
export async function requireApprovedUser(
  requiredRole: Role = 'volunteer',
): Promise<UserProfile> {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    redirect('/login')
  }

  if (!canAccess(profile, requiredRole)) {
    // Split on why: an unapproved account gets the explanation, an approved
    // one that simply outranks nothing here gets the plain 403.
    redirectUnapprovedOrForbid(profile)
  }

  return profile
}

/**
 * Route Handler and Server Action gate. Throws Next's 403 interrupt for any
 * caller that isn't an approved user holding `requiredRole` or higher, so an
 * unapproved volunteer hitting an endpoint gets a 403 rather than HTML.
 */
export async function requireApprovedAccess(
  requiredRole: Role = 'volunteer',
): Promise<UserProfile> {
  const profile = await getCurrentUserProfile()

  if (!profile || !canAccess(profile, requiredRole)) {
    forbidden()
  }

  return profile
}

/** Never returns: both branches throw a navigation interrupt. */
function redirectUnapprovedOrForbid(profile: UserProfile): never {
  if (!isApproved(profile)) {
    redirect('/pending')
  }

  forbidden()
}
