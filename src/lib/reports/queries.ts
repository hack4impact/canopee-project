import { and, asc, desc, eq, gte, isNotNull, isNull, lte } from 'drizzle-orm'
import { db, reports } from '@/db'

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
