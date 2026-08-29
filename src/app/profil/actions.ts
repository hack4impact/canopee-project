'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { db, patrols, reports, users } from '@/db'
import { requireApprovedUser } from '@/lib/auth/current-user'
import {
  isValid,
  validatePasswordChange,
  type PasswordChangeErrors,
} from '@/lib/auth/validation'
import { createClient } from '@/lib/supabase/server'

/** Keeps the observation but drops every link to the person who filed it. */
const ANONYMISED_REPORTER = 'compte-supprime@reseaucanopee.invalid'

export type PasswordChangeState = {
  errors?: PasswordChangeErrors
  message?: string
  done?: boolean
}

export async function changePassword(
  _previous: PasswordChangeState,
  formData: FormData,
): Promise<PasswordChangeState> {
  const profile = await requireApprovedUser()

  const input = {
    currentPassword: String(formData.get('currentPassword') ?? ''),
    password: String(formData.get('password') ?? ''),
    confirmPassword: String(formData.get('confirmPassword') ?? ''),
  }

  const errors = validatePasswordChange(input)

  if (!isValid(errors)) {
    return { errors }
  }

  const supabase = await createClient()

  // A valid session is not enough on its own: prove the current password too.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: input.currentPassword,
  })

  if (reauthError) {
    return { errors: { currentPassword: 'Mot de passe actuel incorrect.' } }
  }

  const { error } = await supabase.auth.updateUser({ password: input.password })

  if (error) {
    console.error('Password update failed', error)
    return { message: 'Impossible de changer le mot de passe. Réessayez.' }
  }

  return { done: true }
}

export type DeleteAccountState = {
  message?: string
}

export async function deleteAccount(
  _previous: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const profile = await requireApprovedUser()

  if (String(formData.get('confirmation') ?? '').trim() !== 'SUPPRIMER') {
    return { message: 'Saisissez SUPPRIMER pour confirmer.' }
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  // Without the admin key the Supabase login would survive the deletion and let
  // the person sign back in, so refuse rather than delete their data by halves.
  if (!serviceRoleKey || !supabaseUrl) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not configured')
    return {
      message:
        'La suppression de compte n’est pas encore disponible. Contactez un administrateur.',
    }
  }

  const supabase = await createClient()

  await db.transaction(async (tx) => {
    // Observations are worth keeping for the organisation; the link to the
    // person is not. The table requires exactly one of userId or reporterEmail.
    await tx
      .update(reports)
      .set({ userId: null, reporterEmail: ANONYMISED_REPORTER })
      .where(eq(reports.userId, profile.id))

    // Patrols belong to a person by definition, so they go. Points cascade.
    await tx.delete(patrols).where(eq(patrols.userId, profile.id))

    await tx.delete(users).where(eq(users.id, profile.id))
  })

  const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error } = await admin.auth.admin.deleteUser(profile.authUserId)

  if (error) {
    console.error('Auth user deletion failed after data removal', error)
  }

  await supabase.auth.signOut()

  redirect('/login')
}
