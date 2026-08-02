/** Shortest password we accept. Supabase's own minimum is 6, so staying above
 * it means a password we accept is never rejected by Supabase for length. */
export const MIN_PASSWORD_LENGTH = 8

/** The raw signup form values, before any of them are trusted. */
export type SignupInput = {
  email: string
  password: string
  confirmPassword: string
}

/** The raw login form values, before any of them are trusted. */
export type LoginInput = {
  email: string
  password: string
}

/** One message per field that failed. An empty object means the form is fine. */
export type SignupErrors = Partial<Record<keyof SignupInput, string>>
export type LoginErrors = Partial<Record<keyof LoginInput, string>>

// Deliberately loose: something, an @, something, a dot, something. A real
// RFC 5322 pattern is enormous and still can't tell you the address exists.
// Catching typos is the goal; the confirmation email settles the rest.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Checks the signup form. Runs in the browser so the user gets immediate
 * feedback, and again in the Server Action, which is reachable by POST without
 * going through the form at all.
 */
export function validateSignup(input: SignupInput): SignupErrors {
  const errors: SignupErrors = {}
  const email = input.email.trim()

  if (!email) {
    errors.email = 'Saisissez votre adresse courriel.'
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Saisissez une adresse courriel valide.'
  }

  if (!input.password) {
    errors.password = 'Choisissez un mot de passe.'
  } else if (input.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Utilisez au moins ${MIN_PASSWORD_LENGTH} caractères.`
  }

  if (!input.confirmPassword) {
    errors.confirmPassword = 'Confirmez votre mot de passe.'
  } else if (input.password !== input.confirmPassword) {
    errors.confirmPassword = 'Les mots de passe ne correspondent pas.'
  }

  return errors
}

export function validateLogin(input: LoginInput): LoginErrors {
  const errors: LoginErrors = {}
  const email = input.email.trim()

  if (!email) {
    errors.email = 'Saisissez votre adresse courriel.'
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Saisissez une adresse courriel valide.'
  }

  if (!input.password) {
    errors.password = 'Saisissez votre mot de passe.'
  }

  return errors
}

/** True when validation found nothing to complain about. */
export function isValid(errors: SignupErrors | LoginErrors): boolean {
  return Object.keys(errors).length === 0
}
