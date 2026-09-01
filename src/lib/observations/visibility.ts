export const RESOLVED_DELAY_HOURS = 24 * 14

const HOUR_IN_MS = 60 * 60 * 1000

export function resolvedCutoff(
  now: Date,
  hours: number = RESOLVED_DELAY_HOURS,
): Date {
  return new Date(now.getTime() - hours * HOUR_IN_MS)
}
