'use server'

import { and, asc, eq, ne, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db, users } from '@/db'
import { requireAdmin } from '@/lib/auth/current-user'
import { canDeleteAccounts, deleteAccount } from '@/lib/auth/delete-account'
import { ROLES, type Role } from '@/lib/auth/roles'

export type MemberActionState = {
  message?: string
  done?: boolean
}

export type Member = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: Role
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value)
}

export async function listMembers(): Promise<Member[]> {
  await requireAdmin()

  return db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
    })
    .from(users)
    .where(eq(users.status, 'approved'))
    .orderBy(asc(users.email))
}

export async function changeMemberRole(
  _previous: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const admin = await requireAdmin()

  const userId = String(formData.get('userId') ?? '')
  const role = String(formData.get('role') ?? '')

  if (!UUID_PATTERN.test(userId)) {
    return { message: 'Identifiant invalide.' }
  }

  if (!isRole(role)) {
    return { message: 'Rôle invalide.' }
  }

  // Changing your own role is how an administrator locks themselves out.
  if (userId === admin.id) {
    return { message: 'Vous ne pouvez pas changer votre propre rôle.' }
  }

  const [target] = await db
    .select({ role: users.role })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.status, 'approved')))
    .limit(1)

  if (!target) {
    return { message: 'Compte introuvable.' }
  }

  if (target.role === role) {
    return { done: true }
  }

  // And this is how the whole organisation loses its last administrator.
  if (target.role === 'admin') {
    const [remaining] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(
        and(
          eq(users.role, 'admin'),
          eq(users.status, 'approved'),
          ne(users.id, userId),
        ),
      )

    if (!remaining || remaining.count === 0) {
      return { message: 'Il doit rester au moins un administrateur.' }
    }
  }

  await db
    .update(users)
    .set({ role })
    .where(and(eq(users.id, userId), eq(users.status, 'approved')))

  revalidatePath('/admin/membres')

  return { done: true }
}

/** Refuses when this would leave nobody able to administer Canopée. */
async function isLastAdmin(userId: string): Promise<boolean> {
  const [remaining] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(
      and(
        eq(users.role, 'admin'),
        eq(users.status, 'approved'),
        ne(users.id, userId),
      ),
    )

  return !remaining || remaining.count === 0
}

export async function deleteMember(
  _previous: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const admin = await requireAdmin()

  const userId = String(formData.get('userId') ?? '')

  if (!UUID_PATTERN.test(userId)) {
    return { message: 'Identifiant invalide.' }
  }

  if (userId === admin.id) {
    return { message: 'Vous ne pouvez pas supprimer votre propre compte ici.' }
  }

  const [target] = await db
    .select({
      id: users.id,
      role: users.role,
      authUserId: users.authUserId,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!target) {
    return { message: 'Compte introuvable.' }
  }

  if (target.role === 'admin' && (await isLastAdmin(userId))) {
    return { message: 'Il doit rester au moins un administrateur.' }
  }

  if (!canDeleteAccounts()) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not configured')
    return {
      message: 'La suppression de compte n’est pas encore configurée.',
    }
  }

  await deleteAccount(target.id, target.authUserId)

  revalidatePath('/admin/membres')

  return { done: true }
}
