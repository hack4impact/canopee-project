import { eq } from 'drizzle-orm'
import { forbidden, redirect } from 'next/navigation'
import { db, users } from '@/db'
import { canAccess, isAdmin, isApproved, type Role } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'

export type UserProfile = typeof users.$inferSelect

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

export async function requireAdmin(): Promise<UserProfile> {
  const profile = await getCurrentUserProfile()

  if (!profile || !isAdmin(profile)) {
    forbidden()
  }

  return profile
}

export async function requireApprovedUser(
  requiredRole: Role = 'volunteer',
): Promise<UserProfile> {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    redirect('/login')
  }

  if (!canAccess(profile, requiredRole)) {
    redirectUnapprovedOrForbid(profile)
  }

  return profile
}

export async function requireApprovedAccess(
  requiredRole: Role = 'volunteer',
): Promise<UserProfile> {
  const profile = await getCurrentUserProfile()

  if (!profile || !canAccess(profile, requiredRole)) {
    forbidden()
  }

  return profile
}

function redirectUnapprovedOrForbid(profile: UserProfile): never {
  if (!isApproved(profile)) {
    redirect('/pending')
  }

  forbidden()
}
