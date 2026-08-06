'use server'

import { redirect } from 'next/navigation'
import { db, users } from '@/db'
import {
  isValid,
  validateSignup,
  type SignupErrors,
} from '@/lib/auth/validation'
import { createClient } from '@/lib/supabase/server'

/** What the form renders after a submission. Empty on the first paint. */
export type SignupState = {
  /** Something went wrong that isn't tied to a single field. */
  message?: string
  /** Per-field messages, shown under the input that caused them. */
  errors?: SignupErrors
}

const EMAIL_TAKEN = 'Un compte avec cette adresse courriel existe déjà.'

/** Postgres unique violation, raised if the email is already in `users`. */
const UNIQUE_VIOLATION = '23505'

function isUniqueViolation(cause: unknown): boolean {
  return (
    typeof cause === 'object' &&
    cause !== null &&
    'code' in cause &&
    cause.code === UNIQUE_VIOLATION
  )
}

/**
 * Creates the Supabase auth user and the matching `users` row, then sends the
 * new account to the home page.
 *
 * The two writes aren't a single transaction: they go to Supabase Auth and to
 * Postgres separately. If the second one fails the auth user is left without a
 * profile row, and the message below says so rather than pretending it worked.
 */
export async function signup(
  prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const input = {
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
    confirmPassword: String(formData.get('confirmPassword') ?? ''),
  }

  // The browser checks this too. Repeated here because a Server Action is a
  // POST endpoint, and nothing forces a caller to go through the form.
  const errors = validateSignup(input)
  if (!isValid(errors)) {
    return { errors }
  }

  // Supabase stores emails lowercased, and Postgres unique constraints are
  // case sensitive. Normalise so both sides agree on what counts as taken.
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

  // With email confirmation switched on, Supabase answers a duplicate signup
  // with a success response and a decoy user whose `identities` are empty,
  // so that the form can't be used to discover who already has an account.
  if (!data.user || data.user.identities?.length === 0) {
    return { errors: { email: EMAIL_TAKEN } }
  }

  try {
    // `role` and `status` are left out on purpose. The migration defaults them
    // to volunteer and pending, which is what a public signup should get.
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

  // Throws internally, so it has to sit outside the try above or the catch
  // will swallow it and the redirect will never happen.
  redirect('/')
}
