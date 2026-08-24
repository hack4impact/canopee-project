import type { NextRequest } from 'next/server'
import { getCurrentUserProfile } from '@/lib/auth/current-user'
import { canAccess } from '@/lib/auth/roles'
import { listReportPins } from '@/lib/reports/queries'
import { parseStatusParam, REPORT_STATUSES } from '@/lib/reports/pins'

export async function GET(request: NextRequest) {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    return Response.json({ error: 'Not signed in.' }, { status: 401 })
  }

  if (!canAccess(profile, 'volunteer')) {
    return Response.json({ error: 'Account not approved.' }, { status: 403 })
  }

  const parsed = parseStatusParam(request.nextUrl.searchParams.get('status'))

  if (!parsed.ok) {
    return Response.json(
      {
        error: `Unknown status "${parsed.value}". Expected one of: ${REPORT_STATUSES.join(', ')}.`,
      },
      { status: 400 },
    )
  }

  const reports = await listReportPins(parsed.status)

  return Response.json({ status: parsed.status, reports })
}
