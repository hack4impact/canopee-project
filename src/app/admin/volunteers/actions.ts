'use server'

import { and, desc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db, users } from '@/db'
import { requireAdmin } from '@/lib/auth/current-user'

export type VolunteerActionState = {
  message?: string
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

async function updatePendingUser(
  userId: string,
  update:
    { status: 'approved' } | { status: 'rejected'; rejectionReason?: string },
): Promise<VolunteerActionState> {
  await requireAdmin()

  if (!isUuid(userId)) {
    return { message: 'Invalid user id.' }
  }

  const [updated] = await db
    .update(users)
    .set(update)
    .where(and(eq(users.id, userId), eq(users.status, 'pending')))
    .returning({ id: users.id })

  if (!updated) {
    return { message: 'User not found or no longer pending.' }
  }

  revalidatePath('/admin/volunteers')
  return {}
}

export async function approveVolunteer(
  _prevState: VolunteerActionState,
  formData: FormData,
): Promise<VolunteerActionState> {
  const userId = String(formData.get('userId') ?? '')
  return updatePendingUser(userId, { status: 'approved' })
}

export async function rejectVolunteer(
  _prevState: VolunteerActionState,
  formData: FormData,
): Promise<VolunteerActionState> {
  const userId = String(formData.get('userId') ?? '')
  const reason = String(formData.get('reason') ?? '').trim()

  return updatePendingUser(userId, {
    status: 'rejected',
    ...(reason ? { rejectionReason: reason } : {}),
  })
}

export async function getPendingUsers() {
  await requireAdmin()

  return db
    .select({
      id: users.id,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.status, 'pending'))
    .orderBy(desc(users.createdAt))
}
