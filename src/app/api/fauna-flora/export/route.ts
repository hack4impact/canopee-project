import type { NextRequest } from 'next/server'
import { getCurrentUserProfile } from '@/lib/auth/current-user'
import { canViewObservations } from '@/lib/observations/access'
import {
  exportFileName,
  parseDelimiterParam,
  toCsv,
} from '@/lib/observations/export'
import { listObservationsForExport } from '@/lib/observations/queries'
import { parseDateRangeParams } from '@/lib/reports/date-range'

export async function GET(request: NextRequest) {
  const profile = await getCurrentUserProfile()

  if (!canViewObservations(profile)) {
    return Response.json({ error: 'Insufficient role.' }, { status: 403 })
  }

  const dateRange = parseDateRangeParams(
    request.nextUrl.searchParams.get('startDate'),
    request.nextUrl.searchParams.get('endDate'),
  )

  if (!dateRange.ok) {
    return Response.json({ error: dateRange.error }, { status: 400 })
  }

  const delimiter = parseDelimiterParam(request.nextUrl.searchParams.get('sep'))
  const observations = await listObservationsForExport(profile, dateRange.range)

  return new Response(toCsv(observations, delimiter), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${exportFileName(new Date())}"`,
      'Cache-Control': 'no-store',
    },
  })
}
