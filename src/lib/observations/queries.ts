import { desc, inArray } from 'drizzle-orm'
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

export async function listObservations(
  viewer: ObservationViewer,
): Promise<Observation[]> {
if (!canViewObservations(viewer)) {
  console.debug('[observations] Unauthorized access attempt', { viewer })
  return []
}

  const rows = await db
    .select({
      id: reports.id,
      category: reports.category,
      latitude: reports.latitude,
      longitude: reports.longitude,
    })
    .from(reports)
    .where(inArray(reports.category, [...OBSERVATION_CATEGORIES]))
    .orderBy(desc(reports.createdAt))

  return rows.map((row) => ({
    id: row.id,
    category: row.category as ObservationCategory,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
  }))
}
