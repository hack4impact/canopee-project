import { and, asc, desc, eq, gte, lte } from 'drizzle-orm'
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

export async function listAllReports(): Promise<ReportListItem[]> {
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
    .orderBy(desc(reports.createdAt))
}
