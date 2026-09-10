'use server'

import { redirect } from 'next/navigation'
import {
  isValid,
  validateNewPassword,
  type NewPasswordErrors,
} from '@/lib/auth/validation'
import { createClient } from '@/lib/supabase/server'

export type NewPasswordState = {
  message?: string
  errors?: NewPasswordErrors
}

export async function updatePassword(
  _previous: NewPasswordState,
  formData: FormData,
): Promise<NewPasswordState> {
  const input = {
    password: String(formData.get('password') ?? ''),
    confirmPassword: String(formData.get('confirmPassword') ?? ''),
  }

  const errors = validateNewPassword(input)

  if (!isValid(errors)) {
    return { errors }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      message:
        'Votre lien de réinitialisation a expiré. Demandez-en un nouveau.',
    }
  }

  const { error } = await supabase.auth.updateUser({ password: input.password })

  if (error) {
    if (error.code === 'same_password') {
      return {
        errors: {
          password: 'Choisissez un mot de passe différent de l’actuel.',
        },
      }
    }

    console.error('Password reset failed', error)

    return { message: 'Impossible de changer le mot de passe. Réessayez.' }
  }

  redirect('/')
}
