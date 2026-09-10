import { createClient as createAdminClient } from '@supabase/supabase-js'
import { eq } from 'drizzle-orm'
import { db, patrols, reports, users } from '@/db'

/** Keeps the observation but drops every link to the person who filed it. */
export const ANONYMISED_REPORTER = 'compte-supprime@reseaucanopee.invalid'

/**
 * Without the admin key the Supabase login survives the deletion and the person
 * can sign straight back in, so callers must refuse rather than delete by halves.
 */
export function canDeleteAccounts(): boolean {
  return Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  )
}

export async function deleteAccount(
  userId: string,
  authUserId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    // Observations are worth keeping for the organisation; the link to the
    // person is not. The table requires exactly one of userId or reporterEmail.
    await tx
      .update(reports)
      .set({ userId: null, reporterEmail: ANONYMISED_REPORTER })
      .where(eq(reports.userId, userId))

    // Patrols belong to a person by definition, so they go. Points cascade.
    await tx.delete(patrols).where(eq(patrols.userId, userId))

    await tx.delete(users).where(eq(users.id, userId))
  })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { error } = await admin.auth.admin.deleteUser(authUserId)

  if (error) {
    console.error('Auth user deletion failed after data removal', error)
  }
}
