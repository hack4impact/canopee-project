export const DEFAULT_RESOLVED_DELAY_HOURS = 48

const HOUR_IN_MS = 60 * 60 * 1000

export function parseResolvedDelayHours(
  value: string | null | undefined,
): number {
  const hours = Number(value)

  if (!value || !Number.isFinite(hours) || hours <= 0) {
    return DEFAULT_RESOLVED_DELAY_HOURS
  }

  return hours
}

export function resolvedDelayHours(): number {
  return parseResolvedDelayHours(process.env.REPORTS_MAP_RESOLVED_DELAY_HOURS)
}

export function resolvedCutoff(
  now: Date,
  hours: number = DEFAULT_RESOLVED_DELAY_HOURS,
): Date {
  return new Date(now.getTime() - hours * HOUR_IN_MS)
}
