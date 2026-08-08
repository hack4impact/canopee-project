import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { mapLoadCounters } from '@/db/schema'
import { computeMapboxUsageStatus, getMonthKey } from '@/lib/mapbox'

/**
 * Daily Vercel Cron job (see vercel.json). Compares our self-tracked map
 * load count for the current month against Mapbox's 50,000 free-tier
 * threshold, since Mapbox has no usage-statistics API to query directly.
 */
export async function GET(request: Request) {
  if (process.env.CRON_SECRET) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  const now = new Date()
  const month = getMonthKey(now)

  const [row] = await db
    .select()
    .from(mapLoadCounters)
    .where(eq(mapLoadCounters.month, month))

  const status = computeMapboxUsageStatus(row?.count ?? 0, now)

  console.log(
    `[mapbox-usage] ${status.month}: ${status.count}/${status.threshold} loads ` +
      `(${(status.percentUsed * 100).toFixed(1)}%), ${status.remaining} remaining. ` +
      `Projected month-end: ${status.projectedMonthly} (${(status.projectedPercent * 100).toFixed(1)}%).`,
  )

  if (status.isWarning) {
    console.warn(
      `[mapbox-usage] WARNING: projected usage ${status.projectedMonthly} ` +
        `is at or above 80% of the ${status.threshold} free-tier threshold. ` +
        `Check the Mapbox dashboard and consider action before month-end.`,
    )
  }

  return Response.json(status)
}
