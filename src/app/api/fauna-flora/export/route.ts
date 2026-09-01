import type { NextRequest } from 'next/server'
import { getCurrentUserProfile } from '@/lib/auth/current-user'
import { canViewObservations } from '@/lib/observations/access'
import {
  exportFileName,
  parseDelimiterParam,
  toCsv,
} from '@/lib/observations/export'
import { listObservationsForExport } from '@/lib/observations/queries'

export async function GET(request: NextRequest) {
  const profile = await getCurrentUserProfile()

  if (!canViewObservations(profile)) {
    return Response.json({ error: 'Insufficient role.' }, { status: 403 })
  }

  const delimiter = parseDelimiterParam(request.nextUrl.searchParams.get('sep'))
  const observations = await listObservationsForExport(profile)

  return new Response(toCsv(observations, delimiter), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${exportFileName(new Date())}"`,
      'Cache-Control': 'no-store',
    },
  })
}
