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
  or,
  sql,
} from 'drizzle-orm'
import { woodedAreaAt } from '@/lib/patrols/woods'
import { db, reports, users } from '@/db'
import { resolvedCutoff } from '@/lib/observations/visibility'
import type { ReportExportRow } from '@/lib/reports/csv'
import {
  sortReportsByHistory,
  type ReportHistorySort,
  type ReportHistoryStatus,
} from '@/lib/reports/history'
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
import type { DateRange } from '@/lib/reports/date-range'

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
  if (!endedAt) return []
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
  description: string | null
  species: string | null
  typology: string | null
  quantity: number | null
  unit: string | null
  habitat: string | null
  statut: string | null
  latitude: number
  longitude: number
  photoUrl: string | null
  createdAt: Date
  resolvedAt: Date | null
  reporter: string
  woodedArea: string | null
}

export function reporterLabel(
  firstName: string | null,
  lastName: string | null,
  reporterEmail: string | null,
): string {
  const name = [firstName, lastName].filter(Boolean).join(' ')

  if (name) {
    return name
  }

  return reporterEmail ? 'Signalement citoyen' : 'Compte supprimé'
}
export type ReportSortBy = 'wooded'
export type ReportStatusFilter = 'open' | 'resolved' | 'all'

function woodedAreaLabel(latitude: number, longitude: number): string {
  return woodedAreaAt({ latitude, longitude }) ?? 'Autre'
}

export async function listAllReports(
  options: { sortBy?: ReportSortBy; statusFilter?: ReportStatusFilter } = {},
): Promise<ReportListItem[]> {
  const { sortBy = 'wooded', statusFilter = 'all' } = options
  const whereClause =
    statusFilter === 'open'
      ? isNull(reports.resolvedAt)
      : statusFilter === 'resolved'
        ? isNotNull(reports.resolvedAt)
        : undefined
  const orderByClause =
    sortBy === 'wooded' ? desc(reports.createdAt) : desc(reports.createdAt)

  const rows = await db
    .select({
      id: reports.id,
      eventNumber: reports.eventNumber,
      category: reports.category,
      description: reports.description,
      species: reports.species,
      typology: reports.typology,
      quantity: reports.quantity,
      unit: reports.unit,
      habitat: reports.habitat,
      statut: reports.statut,
      latitude: reports.latitude,
      longitude: reports.longitude,
      photoUrl: reports.photoUrl,
      createdAt: reports.createdAt,
      resolvedAt: reports.resolvedAt,
      reporterEmail: reports.reporterEmail,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(reports)
    .leftJoin(users, eq(reports.userId, users.id))
    .where(whereClause)
    .orderBy(orderByClause)

  return sortReportsByHistory(
    rows.map(
      ({ firstName, lastName, reporterEmail, ...row }): ReportListItem => ({
        ...row,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        reporter: reporterLabel(firstName, lastName, reporterEmail),
        woodedArea: woodedAreaLabel(
          Number(row.latitude),
          Number(row.longitude),
        ),
      }),
    ),
    'wooded',
  )
}

export async function listReportPins(
  status: ReportStatus,
  categories: readonly ReportCategory[] = PIN_CATEGORIES,
): Promise<ReportPin[]> {
  if (categories.length === 0) return []
  const rows = await db
    .select({
      id: reports.id,
      eventNumber: reports.eventNumber,
      latitude: reports.latitude,
      longitude: reports.longitude,
      category: reports.category,
      photoUrl: reports.photoUrl,
      createdAt: reports.createdAt,
      resolvedAt: reports.resolvedAt,
    })
    .from(reports)
    .where(
      and(
        status === 'open'
          ? or(
              isNull(reports.resolvedAt),
              gte(reports.resolvedAt, resolvedCutoff(new Date())),
            )
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
    hasPhoto: row.photoUrl !== null,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
  }))
}

export const REPORTS_PAGE_SIZE = 20

export type UserReport = {
  id: string
  eventNumber: number
  category: ReportCategory
  createdAt: Date
  resolvedAt: Date | null
  woodedArea: string
}

export type UserReportPage = {
  items: UserReport[]
  hasNextPage: boolean
}

function statusCondition(status: ReportHistoryStatus) {
  if (status === 'open') {
    return isNull(reports.resolvedAt)
  }

  return status === 'resolved' ? isNotNull(reports.resolvedAt) : undefined
}

export async function listReportsForUser(
  userId: string,
  options: {
    page?: number
    status?: ReportHistoryStatus
    sort?: ReportHistorySort
  } = {},
): Promise<UserReportPage> {
  const { page = 1, status = 'all', sort = 'wooded' } = options
  const offset = Math.max(0, page - 1) * REPORTS_PAGE_SIZE

  const rows = await db
    .select({
      id: reports.id,
      eventNumber: reports.eventNumber,
      category: reports.category,
      createdAt: reports.createdAt,
      resolvedAt: reports.resolvedAt,
      latitude: reports.latitude,
      longitude: reports.longitude,
    })
    .from(reports)
    .where(and(eq(reports.userId, userId), statusCondition(status)))
    .orderBy(desc(reports.createdAt))
    .limit(REPORTS_PAGE_SIZE + 1)
    .offset(offset)

  const hasNextPage = rows.length > REPORTS_PAGE_SIZE

  const items = (hasNextPage ? rows.slice(0, REPORTS_PAGE_SIZE) : rows).map(
    (row) => ({
      id: row.id,
      eventNumber: row.eventNumber,
      category: row.category,
      createdAt: row.createdAt,
      resolvedAt: row.resolvedAt,
      woodedArea: woodedAreaLabel(Number(row.latitude), Number(row.longitude)),
    }),
  )

  return {
    items: sortReportsByHistory(items, sort),
    hasNextPage,
  }
}

export type ReportDetail = ReportListItem

export async function getReportById(id: string): Promise<ReportDetail | null> {
  const [row] = await db
    .select({
      id: reports.id,
      eventNumber: reports.eventNumber,
      category: reports.category,
      description: reports.description,
      species: reports.species,
      typology: reports.typology,
      quantity: reports.quantity,
      unit: reports.unit,
      habitat: reports.habitat,
      statut: reports.statut,
      latitude: reports.latitude,
      longitude: reports.longitude,
      photoUrl: reports.photoUrl,
      createdAt: reports.createdAt,
      resolvedAt: reports.resolvedAt,
      reporterEmail: reports.reporterEmail,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(reports)
    .leftJoin(users, eq(reports.userId, users.id))
    .where(eq(reports.id, id))
    .limit(1)

  if (!row) {
    return null
  }

  const { firstName, lastName, reporterEmail, ...rest } = row

  return {
    ...rest,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    reporter: reporterLabel(firstName, lastName, reporterEmail),
    woodedArea: woodedAreaAt({
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
    }),
  }
}

export async function getReportPhotoPath(id: string): Promise<string | null> {
  const [row] = await db
    .select({ photoUrl: reports.photoUrl })
    .from(reports)
    .where(eq(reports.id, id))
    .limit(1)

  return row?.photoUrl ?? null
}

export async function countOpenReports(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reports)
    .where(isNull(reports.resolvedAt))

  return row?.count ?? 0
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

export async function listReportsForExport(
  range?: DateRange,
): Promise<ReportExportRow[]> {
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
    .where(
      and(
        range?.start ? gte(reports.createdAt, range.start) : undefined,
        range?.end ? lte(reports.createdAt, range.end) : undefined,
      ),
    )
    .orderBy(asc(reports.eventNumber))
  return rows.map(({ reporterEmail, userEmail, ...row }) => ({
    ...row,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    reporter: userEmail ?? reporterEmail,
  }))
}
