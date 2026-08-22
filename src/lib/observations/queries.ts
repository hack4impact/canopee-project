import { and, desc, gte, inArray, isNull, or } from 'drizzle-orm'
import { db, reports } from '@/db'
import {
  canViewObservations,
  type ObservationViewer,
} from '@/lib/observations/access'
import {
  OBSERVATION_CATEGORIES,
  type Observation,
  type ObservationCategory,
} from '@/lib/observations/collection'
import {
  resolvedCutoff,
  resolvedDelayHours,
} from '@/lib/observations/visibility'

export async function listObservations(
  viewer: ObservationViewer,
): Promise<Observation[]> {
  if (!canViewObservations(viewer)) {
    console.debug('[observations] Unauthorized access attempt', { viewer })
    return []
  }

  const cutoff = resolvedCutoff(new Date(), resolvedDelayHours())

  const rows = await db
    .select({
      id: reports.id,
      category: reports.category,
      latitude: reports.latitude,
      longitude: reports.longitude,
    })
    .from(reports)
    .where(
      and(
        inArray(reports.category, [...OBSERVATION_CATEGORIES]),
        or(isNull(reports.resolvedAt), gte(reports.resolvedAt, cutoff)),
      ),
    )
    .orderBy(desc(reports.createdAt))

  return rows.map((row) => ({
    id: row.id,
    category: row.category as ObservationCategory,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
  }))
}
