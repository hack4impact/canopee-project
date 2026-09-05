import { eq } from 'drizzle-orm'
import { forbidden, redirect } from 'next/navigation'
import { db, users } from '@/db'
import { canAccess, isAdmin, isApproved, type Role } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'

export type UserProfile = typeof users.$inferSelect

async function lookupProfileByAuthUserId(
  authUserId: string,
): Promise<UserProfile | null> {
  const profileQuery = db
    .select()
    .from(users)
    .where(eq(users.authUserId, authUserId))
    .limit(1)

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('profile lookup timeout')), 1500)
  })

  try {
    const [profile] = (await Promise.race([profileQuery, timeoutPromise])) as [
      UserProfile | undefined,
    ]

    return profile ?? null
  } catch {
    return null
  }
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return null
    }

    return await lookupProfileByAuthUserId(user.id)
  } catch (error) {
    const cause = (error as { cause?: { code?: string; message?: string } })
      .cause
    console.warn(
      'Unable to resolve the current user profile:',
      error,
      '| cause:',
      cause?.code,
      cause?.message,
    )
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
