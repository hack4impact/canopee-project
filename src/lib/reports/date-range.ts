export type DateRange = { start?: Date; end?: Date }

export type ParsedDateRange =
  { ok: true; range: DateRange } | { ok: false; error: string }

/**
 * Parses `startDate`/`endDate` query params (e.g. "2026-01-31").
 * endDate is treated as a calendar day, so its whole day is included.
 */
export function parseDateRangeParams(
  startParam: string | null,
  endParam: string | null,
): ParsedDateRange {
  let start: Date | undefined
  let end: Date | undefined

  if (startParam) {
    start = new Date(startParam)
    if (Number.isNaN(start.getTime())) {
      return { ok: false, error: `Invalid startDate "${startParam}".` }
    }
  }

  if (endParam) {
    end = new Date(endParam)
    if (Number.isNaN(end.getTime())) {
      return { ok: false, error: `Invalid endDate "${endParam}".` }
    }
    end = new Date(
      Date.UTC(
        end.getUTCFullYear(),
        end.getUTCMonth(),
        end.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    )
  }

  if (start && end && start > end) {
    return { ok: false, error: 'startDate must be before or equal to endDate.' }
  }

  return { ok: true, range: { start, end } }
}

/** Formats a Date as a "YYYY-MM-DD" query param / <input type="date"> value, in local time. */
export function toDateParam(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** The default admin report filter: the last two months, ending today. */
export function lastTwoMonthsRange(now: Date = new Date()): {
  from: Date
  to: Date
} {
  const to = now
  const from = new Date(now)
  from.setMonth(from.getMonth() - 2)
  return { from, to }
}

export function mapDateRange(
  startParam: string | null,
  endParam: string | null,
  canPickDates: boolean,
): ParsedDateRange {
  const { from, to } = lastTwoMonthsRange()

  return parseDateRangeParams(
    (canPickDates && startParam) || toDateParam(from),
    (canPickDates && endParam) || toDateParam(to),
  )
}
