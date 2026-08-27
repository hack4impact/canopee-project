'use server'

import { headers } from 'next/headers'
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
    firstName: String(formData.get('firstName') ?? ''),
    lastName: String(formData.get('lastName') ?? ''),
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
    confirmPassword: String(formData.get('confirmPassword') ?? ''),
  }

  const errors = validateSignup(input)
  if (!isValid(errors)) {
    return { errors }
  }

  const email = input.email.trim().toLowerCase()
  const firstName = input.firstName.trim()
  const lastName = input.lastName.trim()
  const supabase = await createClient()

  const origin = (await headers()).get('origin')

  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: origin
      ? { emailRedirectTo: `${origin}/auth/confirm?next=/` }
      : undefined,
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
    await db
      .insert(users)
      .values({ authUserId: data.user.id, email, firstName, lastName })
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

  // Terminate any session that was active before the signup: the new account
  // is pending approval and must not inherit an approved user's access.
  await supabase.auth.signOut()

  // The new account must confirm its email before it can log in.
  redirect(`/signup/confirm?email=${encodeURIComponent(email)}`)
}
