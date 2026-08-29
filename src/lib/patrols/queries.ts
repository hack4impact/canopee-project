import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from 'drizzle-orm'
import { db, patrolPoints, patrols, users } from '@/db'
import { totalDistanceMetres, type Coordinate } from './distance'

export const PATROLS_PAGE_SIZE = 20

export type Patrol = typeof patrols.$inferSelect

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

export type PatrolRoutePoint = Coordinate & { recordedAt: Date }

/** The user's running patrol, or null. A null `endedAt` is what makes it active. */
export async function getActivePatrol(userId: string): Promise<Patrol | null> {
  const [patrol] = await db
    .select()
    .from(patrols)
    .where(and(eq(patrols.userId, userId), isNull(patrols.endedAt)))
    .orderBy(desc(patrols.startedAt))
    .limit(1)

  return patrol ?? null
}

export async function listPatrolsCovering(
  userId: string,
  from: Date,
  to: Date,
): Promise<Patrol[]> {
  return db
    .select()
    .from(patrols)
    .where(
      and(
        eq(patrols.userId, userId),
        lte(patrols.startedAt, to),
        or(isNull(patrols.endedAt), gte(patrols.endedAt, from)),
      ),
    )
    .orderBy(desc(patrols.startedAt))
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

export function durationSeconds(
  startedAt: Date,
  endedAt: Date | null,
): number | null {
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

export type PatrolTotals = {
  count: number
  distanceMetres: number
  durationSeconds: number
}

/** Totals for the profile tiles, over finished patrols only. */
export async function getPatrolTotalsForUser(
  userId: string,
): Promise<PatrolTotals> {
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      distanceMetres: sql<number>`coalesce(sum(${patrols.distanceMeters}), 0)::int`,
      durationSeconds: sql<number>`coalesce(sum(extract(epoch from (${patrols.endedAt} - ${patrols.startedAt}))), 0)::int`,
    })
    .from(patrols)
    .where(and(eq(patrols.userId, userId), isNotNull(patrols.endedAt)))

  return row ?? { count: 0, distanceMetres: 0, durationSeconds: 0 }
}

export type LastPatrol = {
  id: string
  startedAt: Date
  durationSeconds: number
  distanceMetres: number
}

/** The most recent finished patrol, for the profile preview. */
export async function getLastPatrolForUser(
  userId: string,
): Promise<LastPatrol | null> {
  const [row] = await db
    .select({
      id: patrols.id,
      startedAt: patrols.startedAt,
      durationSeconds: sql<number>`extract(epoch from (${patrols.endedAt} - ${patrols.startedAt}))::int`,
      distanceMetres: sql<number>`coalesce(${patrols.distanceMeters}, 0)::int`,
    })
    .from(patrols)
    .where(and(eq(patrols.userId, userId), isNotNull(patrols.endedAt)))
    .orderBy(desc(patrols.startedAt))
    .limit(1)

  return row ?? null
}

export async function getPatrolById(patrolId: string): Promise<Patrol | null> {
  const [patrol] = await db
    .select()
    .from(patrols)
    .where(eq(patrols.id, patrolId))
    .limit(1)

  return patrol ?? null
}

export type PatrolWithUser = Patrol & { patrollerEmail: string }

export async function getPatrolWithUser(
  patrolId: string,
): Promise<PatrolWithUser | null> {
  const [row] = await db
    .select({ patrol: patrols, patrollerEmail: users.email })
    .from(patrols)
    .innerJoin(users, eq(patrols.userId, users.id))
    .where(eq(patrols.id, patrolId))
    .limit(1)

  return row ? { ...row.patrol, patrollerEmail: row.patrollerEmail } : null
}

export async function listPatrolRoute(
  patrolId: string,
): Promise<PatrolRoutePoint[]> {
  const rows = await db
    .select({
      latitude: patrolPoints.latitude,
      longitude: patrolPoints.longitude,
      recordedAt: patrolPoints.recordedAt,
    })
    .from(patrolPoints)
    .where(eq(patrolPoints.patrolId, patrolId))
    .orderBy(patrolPoints.recordedAt, patrolPoints.id)

  return rows.flatMap((row) => {
    const coordinate = toCoordinate(row.latitude, row.longitude)

    return coordinate ? [{ ...coordinate, recordedAt: row.recordedAt }] : []
  })
}
