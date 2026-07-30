/** Shortest password we accept. Supabase's own minimum is 6, so staying above
 * it means a password we accept is never rejected by Supabase for length. */
export const MIN_PASSWORD_LENGTH = 8

/** The raw signup form values, before any of them are trusted. */
export type SignupInput = {
  email: string
  password: string
  confirmPassword: string
}

/** One message per field that failed. An empty object means the form is fine. */
export type SignupErrors = Partial<Record<keyof SignupInput, string>>

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
    errors.email = 'Enter your email address.'
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.'
  }

  if (!input.password) {
    errors.password = 'Choose a password.'
  } else if (input.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  }

  if (!input.confirmPassword) {
    errors.confirmPassword = 'Confirm your password.'
  } else if (input.password !== input.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  return errors
}

/** True when `validateSignup` found nothing to complain about. */
export function isValid(errors: SignupErrors): boolean {
  return Object.keys(errors).length === 0
}
