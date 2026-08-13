import { desc, eq, inArray } from 'drizzle-orm'
import { db, patrolPoints, patrols } from '@/db'
import { totalDistanceMetres, type Coordinate } from './distance'

export const PATROLS_PAGE_SIZE = 20

export type PatrolListItem = {
  id: string
  startedAt: Date
  endedAt: Date | null
  durationSeconds: number | null
  distanceMetres: number
}

export type PatrolPage = {
  items: PatrolListItem[]
  hasNextPage: boolean
}

export function parsePageParam(value: string | null | undefined): number {
  const page = Number(value)

  if (!value || !Number.isInteger(page) || page < 1) {
    return 1
  }

  return page
}

function toCoordinate(latitude: string, longitude: string): Coordinate | null {
  const parsedLatitude = Number(latitude)
  const parsedLongitude = Number(longitude)

  if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
    return null
  }

  return { latitude: parsedLatitude, longitude: parsedLongitude }
}

function durationSeconds(startedAt: Date, endedAt: Date | null): number | null {
  if (!endedAt) {
    return null
  }

  return Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)
}

export async function listPatrolsForUser(
  userId: string,
  page: number = 1,
): Promise<PatrolPage> {
  const offset = Math.max(0, page - 1) * PATROLS_PAGE_SIZE

  const rows = await db
    .select({
      id: patrols.id,
      startedAt: patrols.startedAt,
      endedAt: patrols.endedAt,
    })
    .from(patrols)
    .where(eq(patrols.userId, userId))
    .orderBy(desc(patrols.startedAt))
    .limit(PATROLS_PAGE_SIZE + 1)
    .offset(offset)

  const hasNextPage = rows.length > PATROLS_PAGE_SIZE
  const pageRows = hasNextPage ? rows.slice(0, PATROLS_PAGE_SIZE) : rows

  if (pageRows.length === 0) {
    return { items: [], hasNextPage: false }
  }

  const pointRows = await db
    .select({
      patrolId: patrolPoints.patrolId,
      latitude: patrolPoints.latitude,
      longitude: patrolPoints.longitude,
    })
    .from(patrolPoints)
    .where(
      inArray(
        patrolPoints.patrolId,
        pageRows.map((row) => row.id),
      ),
    )
    .orderBy(patrolPoints.patrolId, patrolPoints.recordedAt)

  const routes = new Map<string, Coordinate[]>()

  for (const pointRow of pointRows) {
    const coordinate = toCoordinate(pointRow.latitude, pointRow.longitude)

    if (!coordinate) {
      continue
    }

    const route = routes.get(pointRow.patrolId)

    if (route) {
      route.push(coordinate)
    } else {
      routes.set(pointRow.patrolId, [coordinate])
    }
  }

  return {
    items: pageRows.map((row) => ({
      id: row.id,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      durationSeconds: durationSeconds(row.startedAt, row.endedAt),
      distanceMetres: totalDistanceMetres(routes.get(row.id) ?? []),
    })),
    hasNextPage,
  }
}
