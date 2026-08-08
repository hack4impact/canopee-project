/** Mapbox's free-tier monthly map-load allowance. */
export const MAPBOX_FREE_TIER_THRESHOLD = 50_000

/** Fraction of the threshold at which we start warning about projected usage. */
export const MAPBOX_WARNING_RATIO = 0.8

/** UTC calendar-month key ('YYYY-MM') used to bucket the counter table. */
export function getMonthKey(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export type MapboxUsageStatus = {
  month: string
  count: number
  threshold: number
  remaining: number
  percentUsed: number
  /** Linear projection of the full month's usage based on days elapsed so far. */
  projectedMonthly: number
  projectedPercent: number
  isWarning: boolean
}

/**
 * Projects month-to-date usage linearly across the full month. Early in the
 * month a handful of loads can look alarming when projected naively, but
 * this is a lightweight safeguard, not a billing-accurate forecast.
 */
export function computeMapboxUsageStatus(
  count: number,
  now: Date,
): MapboxUsageStatus {
  const month = getMonthKey(now)
  const dayOfMonth = now.getUTCDate()
  const daysInMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
  ).getUTCDate()

  const projectedMonthly = Math.round((count / dayOfMonth) * daysInMonth)
  const threshold = MAPBOX_FREE_TIER_THRESHOLD

  const percentUsed = count / threshold
  const projectedPercent = projectedMonthly / threshold

  return {
    month,
    count,
    threshold,
    remaining: Math.max(threshold - count, 0),
    percentUsed,
    projectedMonthly,
    projectedPercent,
    isWarning: projectedPercent >= MAPBOX_WARNING_RATIO,
  }
}
