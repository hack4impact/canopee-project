import { count, countDistinct, gte, sql } from 'drizzle-orm'
import { db, patrolPoints } from '@/db'
import { DEFAULT_ZONE_PRECISION, windowStart, type HeatmapZone } from './zones'

const MAX_PRECISION = 6

type HeatmapOptions = {
  since?: Date
  precision?: number
}

export async function listHeatmapZones({
  since = windowStart(new Date()),
  precision = DEFAULT_ZONE_PRECISION,
}: HeatmapOptions = {}): Promise<HeatmapZone[]> {
  const scale = Math.min(MAX_PRECISION, Math.max(0, Math.trunc(precision)))

  const latitude = sql<string>`round(${patrolPoints.latitude}, ${sql.raw(String(scale))})`
  const longitude = sql<string>`round(${patrolPoints.longitude}, ${sql.raw(String(scale))})`

  const rows = await db
    .select({
      latitude,
      longitude,
      points: count(),
      patrols: countDistinct(patrolPoints.patrolId),
    })
    .from(patrolPoints)
    .where(gte(patrolPoints.recordedAt, since))
    .groupBy(latitude, longitude)

  return rows.flatMap((row) => {
    const zoneLatitude = Number(row.latitude)
    const zoneLongitude = Number(row.longitude)

    if (!Number.isFinite(zoneLatitude) || !Number.isFinite(zoneLongitude)) {
      return []
    }

    return [
      {
        latitude: zoneLatitude,
        longitude: zoneLongitude,
        points: row.points,
        patrols: row.patrols,
      },
    ]
  })
}
