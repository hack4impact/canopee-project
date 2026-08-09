export const MIN_PASSWORD_LENGTH = 8

export type SignupInput = {
  email: string
  password: string
  confirmPassword: string
}

export type LoginInput = {
  email: string
  password: string
}

export type SignupErrors = Partial<Record<keyof SignupInput, string>>
export type LoginErrors = Partial<Record<keyof LoginInput, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

export function isValid(errors: SignupErrors | LoginErrors): boolean {
  return Object.keys(errors).length === 0
}
