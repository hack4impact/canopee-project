'use server'

import { redirect } from 'next/navigation'
import { db, users } from '@/db'
import {
  isValid,
  validateSignup,
  type SignupErrors,
} from '@/lib/auth/validation'
import { createClient } from '@/lib/supabase/server'

export type SignupState = {
  message?: string
  errors?: SignupErrors
}

const EMAIL_TAKEN = 'Un compte avec cette adresse courriel existe déjà.'

const UNIQUE_VIOLATION = '23505'

function isUniqueViolation(cause: unknown): boolean {
  return (
    typeof cause === 'object' &&
    cause !== null &&
    'code' in cause &&
    cause.code === UNIQUE_VIOLATION
  )
}

export async function signup(
  prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const input = {
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
    confirmPassword: String(formData.get('confirmPassword') ?? ''),
  }

  const errors = validateSignup(input)
  if (!isValid(errors)) {
    return { errors }
  }

  const email = input.email.trim().toLowerCase()
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
  })

  if (error) {
    if (error.code === 'user_already_exists' || error.status === 422) {
      return { errors: { email: EMAIL_TAKEN } }
    }

    return { message: error.message }
  }

  if (!data.user || data.user.identities?.length === 0) {
    return { errors: { email: EMAIL_TAKEN } }
  }

  try {
    await db.insert(users).values({ authUserId: data.user.id, email })
  } catch (cause) {
    if (isUniqueViolation(cause)) {
      return { errors: { email: EMAIL_TAKEN } }
    }

    console.error(
      'Signup succeeded in Supabase but the users row failed',
      cause,
    )

    return {
      message:
        'Votre connexion a été créée, mais votre profil n’a pas été enregistré. Contactez un administrateur avant de réessayer.',
    }
  }

  redirect('/')
}
