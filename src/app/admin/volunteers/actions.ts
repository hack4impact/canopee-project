'use server'

import { eq } from 'drizzle-orm'
import { db, users } from '@/db'
import { sendApprovalEmail, sendRejectionEmail } from '@/lib/plunk'

export async function approveVolunteer(userId: string, userEmail: string) {
  await db.update(users).set({ status: 'approved' }).where(eq(users.id, userId))

  await sendApprovalEmail(userEmail)
}

export async function rejectVolunteer(userId: string, userEmail: string) {
  await db.update(users).set({ status: 'rejected' }).where(eq(users.id, userId))

  await sendRejectionEmail(userEmail)
}
