'use server'

import { redirect } from 'next/navigation'
import { ensureUserProfile, type UserProfile } from '@/lib/auth/ensure-profile'
import { isApproved } from '@/lib/auth/roles'
import {
  getPostLoginRedirect,
  REDIRECT_PARAM,
  safeRedirectPath,
} from '@/lib/auth/routes'
import { isValid, validateLogin, type LoginErrors } from '@/lib/auth/validation'
import { createClient } from '@/lib/supabase/server'

export type LoginState = {
  message?: string
  errors?: LoginErrors
}

function loginErrorMessage(code?: string): string {
  if (code === 'email_not_confirmed') {
    return 'Confirmez votre courriel avant de vous connecter.'
  }

  return 'Courriel ou mot de passe invalide.'
}

export async function login(
  prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const input = {
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  }

  const errors = validateLogin(input)
  if (!isValid(errors)) {
    return { errors }
  }

  // Re-validated here rather than trusted from the form: this is a POST
  // endpoint, and a caller can put anything in the field.
  const redirectTo = safeRedirectPath(
    String(formData.get(REDIRECT_PARAM) ?? ''),
  )

  const email = input.email.trim().toLowerCase()
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: input.password,
  })

  if (error) {
    return { message: loginErrorMessage(error.code) }
  }

  if (!data.session || !data.user) {
    return { message: loginErrorMessage('email_not_confirmed') }
  }

  let profile: UserProfile

  try {
    profile = await ensureUserProfile(data.user.id, email)
  } catch (cause) {
    console.error('Login succeeded in Supabase but the users row failed', cause)
    await supabase.auth.signOut()
    return {
      message:
        'Vous êtes connecté, mais votre profil est manquant. Contactez un administrateur.',
    }
  }

  // An account still awaiting review — or one an admin turned down — can sign
  // in, but can't use the app. Send it straight to the screen that says so
  // rather than bouncing it off the home page gate.
  redirect(getPostLoginRedirect(redirectTo, isApproved(profile)))
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
