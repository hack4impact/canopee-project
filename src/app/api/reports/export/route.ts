import type { NextRequest } from 'next/server'
import { getCurrentUserProfile } from '@/lib/auth/current-user'
import { canAccess } from '@/lib/auth/roles'
import {
  CSV_HEADERS,
  csvFileName,
  parseColumnsParam,
  reportsToCsv,
} from '@/lib/reports/csv'
import { listReportsForExport } from '@/lib/reports/queries'
import { parseDateRangeParams } from '@/lib/reports/date-range'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    return Response.json({ error: 'Not signed in.' }, { status: 401 })
  }

  if (!canAccess(profile, 'pro')) {
    return Response.json({ error: 'Insufficient role.' }, { status: 403 })
  }

  const parsed = parseColumnsParam(request.nextUrl.searchParams.get('columns'))

  if (!parsed.ok) {
    return Response.json(
      {
        error: `Unknown column "${parsed.value}". Expected one of: ${CSV_HEADERS.join(', ')}.`,
      },
      { status: 400 },
    )
  }

  const dateRange = parseDateRangeParams(
    request.nextUrl.searchParams.get('startDate'),
    request.nextUrl.searchParams.get('endDate'),
  )

  if (!dateRange.ok) {
    return Response.json({ error: dateRange.error }, { status: 400 })
  }

  const reports = await listReportsForExport(dateRange.range)

  return new Response(reportsToCsv(reports, parsed.columns), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${csvFileName(new Date())}"`,
      'Cache-Control': 'no-store',
    },
  })
}
