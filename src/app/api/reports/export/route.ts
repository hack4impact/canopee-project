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

  // Encoded as actual UTF-16LE bytes (not just UTF-8 text with a BOM
  // character) so Excel reliably auto-detects the encoding on both Mac
  // and Windows, regardless of locale. See CSV_BOM in lib/reports/csv.ts.
  const csvBytes = Buffer.from(reportsToCsv(reports, parsed.columns), 'utf16le')

  return new Response(csvBytes, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-16le',
      'Content-Disposition': `attachment; filename="${csvFileName(new Date())}"`,
      'Cache-Control': 'no-store',
    },
  })
}
