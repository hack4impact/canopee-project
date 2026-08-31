import { EMAIL_PATTERN } from '@/lib/auth/validation'

export const MAX_REPORTER_EMAIL_LENGTH = 254

export const CITIZEN_WINDOW_MS = 60 * 60_000

export const MAX_CITIZEN_REPORTS_PER_WINDOW = 5

export function validateReporterEmail(value: string): string | null {
  const email = value.trim()

  if (!email) {
    return 'Saisissez votre adresse courriel pour recevoir le suivi.'
  }

  if (email.length > MAX_REPORTER_EMAIL_LENGTH) {
    return `Utilisez au plus ${MAX_REPORTER_EMAIL_LENGTH} caractères.`
  }

  if (!EMAIL_PATTERN.test(email)) {
    return 'Saisissez une adresse courriel valide.'
  }

  return null
}

export function normalizeReporterEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function citizenWindowStart(now: Date): Date {
  return new Date(now.getTime() - CITIZEN_WINDOW_MS)
}

export function isRateLimited(recentCount: number): boolean {
  return recentCount >= MAX_CITIZEN_REPORTS_PER_WINDOW
}
