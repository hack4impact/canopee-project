import type { NextRequest } from 'next/server'
import { getCurrentUserProfile } from '@/lib/auth/current-user'
import { isAdmin } from '@/lib/auth/roles'
import { canViewObservations } from '@/lib/observations/access'
import { toFeatureCollection } from '@/lib/observations/collection'
import { listObservations } from '@/lib/observations/queries'
import { mapDateRange } from '@/lib/reports/date-range'

export async function GET(request: NextRequest) {
  const profile = await getCurrentUserProfile()

  if (!canViewObservations(profile)) {
    return Response.json({ error: 'Insufficient role.' }, { status: 403 })
  }

  const dateRange = mapDateRange(
    request.nextUrl.searchParams.get('startDate'),
    request.nextUrl.searchParams.get('endDate'),
    isAdmin(profile),
  )

  if (!dateRange.ok) {
    return Response.json({ error: dateRange.error }, { status: 400 })
  }

  const observations = await listObservations(profile, dateRange.range)

  return Response.json({
    observations: toFeatureCollection(observations),
  })
}
