import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  sql,
} from 'drizzle-orm'
import { db, reports, users } from '@/db'
import type { ReportExportRow } from '@/lib/reports/csv'
import {
  PIN_CATEGORIES,
  type ReportPin,
  type ReportStatus,
} from '@/lib/reports/pins'

export {
  REPORT_CATEGORY_LABELS,
  type ReportCategory,
} from '@/lib/reports/categories'

import type { ReportCategory } from '@/lib/reports/categories'

export type PatrolReport = {
  id: string
  eventNumber: number
  category: ReportCategory
  createdAt: Date
  resolvedAt: Date | null
}

export async function listReportsDuringPatrol(
  userId: string,
  startedAt: Date,
  endedAt: Date | null,
): Promise<PatrolReport[]> {
  if (!endedAt) {
    return []
  }

  return db
    .select({
      id: reports.id,
      eventNumber: reports.eventNumber,
      category: reports.category,
      createdAt: reports.createdAt,
      resolvedAt: reports.resolvedAt,
    })
    .from(reports)
    .where(
      and(
        eq(reports.userId, userId),
        gte(reports.createdAt, startedAt),
        lte(reports.createdAt, endedAt),
      ),
    )
    .orderBy(asc(reports.createdAt))
}

export type ReportListItem = {
  id: string
  eventNumber: number
  category: ReportCategory
  photoUrl: string | null
  createdAt: Date
  resolvedAt: Date | null
}

export type ReportSortBy = 'date' | 'status'
export type ReportStatusFilter = 'open' | 'resolved' | 'all'

export async function listAllReports(
  options: {
    sortBy?: ReportSortBy
    statusFilter?: ReportStatusFilter
  } = {},
): Promise<ReportListItem[]> {
  const { sortBy = 'date', statusFilter = 'all' } = options

  const whereClause =
    statusFilter === 'open'
      ? isNull(reports.resolvedAt)
      : statusFilter === 'resolved'
        ? isNotNull(reports.resolvedAt)
        : undefined

  const orderByClause =
    sortBy === 'status' ? asc(reports.resolvedAt) : desc(reports.createdAt)

  return db
    .select({
      id: reports.id,
      eventNumber: reports.eventNumber,
      category: reports.category,
      photoUrl: reports.photoUrl,
      createdAt: reports.createdAt,
      resolvedAt: reports.resolvedAt,
    })
    .from(reports)
    .where(whereClause)
    .orderBy(orderByClause)
}

export async function listReportPins(
  status: ReportStatus,
  categories: readonly ReportCategory[] = PIN_CATEGORIES,
): Promise<ReportPin[]> {
  if (categories.length === 0) {
    return []
  }

  const rows = await db
    .select({
      id: reports.id,
      eventNumber: reports.eventNumber,
      latitude: reports.latitude,
      longitude: reports.longitude,
      category: reports.category,
    })
    .from(reports)
    .where(
      and(
        status === 'open'
          ? isNull(reports.resolvedAt)
          : isNotNull(reports.resolvedAt),
        inArray(reports.category, [...categories]),
      ),
    )
    .orderBy(desc(reports.createdAt))

  return rows.map((row) => ({
    id: row.id,
    eventNumber: row.eventNumber,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    category: row.category,
  }))
}

export type ReportTotals = {
  count: number
  resolved: number
}

export async function getReportTotalsForUser(
  userId: string,
): Promise<ReportTotals> {
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      resolved: sql<number>`count(${reports.resolvedAt})::int`,
    })
    .from(reports)
    .where(eq(reports.userId, userId))

  return row ?? { count: 0, resolved: 0 }
}

export async function countRecentCitizenReports(
  email: string,
  since: Date,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reports)
    .where(and(eq(reports.reporterEmail, email), gte(reports.createdAt, since)))

  return row?.count ?? 0
}

export async function listReportsForExport(): Promise<ReportExportRow[]> {
  const rows = await db
    .select({
      eventNumber: reports.eventNumber,
      category: reports.category,
      description: reports.description,
      typology: reports.typology,
      quantity: reports.quantity,
      species: reports.species,
      unit: reports.unit,
      habitat: reports.habitat,
      statut: reports.statut,
      latitude: reports.latitude,
      longitude: reports.longitude,
      photoUrl: reports.photoUrl,
      createdAt: reports.createdAt,
      resolvedAt: reports.resolvedAt,
      reporterEmail: reports.reporterEmail,
      userEmail: users.email,
    })
    .from(reports)
    .leftJoin(users, eq(reports.userId, users.id))
    .orderBy(asc(reports.eventNumber))

  return rows.map(({ reporterEmail, userEmail, ...row }) => ({
    ...row,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    reporter: userEmail ?? reporterEmail,
  }))
}
