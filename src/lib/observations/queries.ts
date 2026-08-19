import { desc, inArray } from 'drizzle-orm'
import { db, reports } from '@/db'
import {
  OBSERVATION_CATEGORIES,
  type Observation,
  type ObservationCategory,
} from '@/lib/observations/collection'

export async function listObservations(): Promise<Observation[]> {
  const rows = await db
    .select({
      id: reports.id,
      eventNumber: reports.eventNumber,
      category: reports.category,
      latitude: reports.latitude,
      longitude: reports.longitude,
    })
    .from(reports)
    .where(inArray(reports.category, [...OBSERVATION_CATEGORIES]))
    .orderBy(desc(reports.createdAt))

  return rows.map((row) => ({
    id: row.id,
    eventNumber: row.eventNumber,
    category: row.category as ObservationCategory,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
  }))
}
