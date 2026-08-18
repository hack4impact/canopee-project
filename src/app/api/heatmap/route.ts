import type { NextRequest } from 'next/server'
import { getCurrentUserProfile } from '@/lib/auth/current-user'
import { canAccess } from '@/lib/auth/roles'
import { listHeatmapZones } from '@/lib/heatmap/queries'
import {
  maxPoints,
  parseMonthsParam,
  toFeatureCollection,
  windowStart,
} from '@/lib/heatmap/zones'

export async function GET(request: NextRequest) {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    return Response.json({ error: 'Not signed in.' }, { status: 401 })
  }

  if (!canAccess(profile, 'volunteer')) {
    return Response.json({ error: 'Account not approved.' }, { status: 403 })
  }

  const months = parseMonthsParam(request.nextUrl.searchParams.get('months'))
  const since = windowStart(new Date(), months)
  const zones = await listHeatmapZones({ since })

  return Response.json({
    months,
    since: since.toISOString(),
    maxPoints: maxPoints(zones),
    zones: toFeatureCollection(zones),
  })
}
