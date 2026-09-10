'use server'

import { redirect } from 'next/navigation'
import {
  canDeleteAccounts,
  deleteAccount as removeAccount,
} from '@/lib/auth/delete-account'
import { requireApprovedUser } from '@/lib/auth/current-user'
import {
  isValid,
  validatePasswordChange,
  type PasswordChangeErrors,
} from '@/lib/auth/validation'
import { createClient } from '@/lib/supabase/server'

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

  if (!canDeleteAccounts()) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not configured')
    return {
      message:
        'La suppression de compte n’est pas encore disponible. Contactez un administrateur.',
    }
  }

  const supabase = await createClient()

  await removeAccount(profile.id, profile.authUserId)

  await supabase.auth.signOut()

  redirect('/login')
}
