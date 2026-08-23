import {
  and,
  asc,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  lte,
  notInArray,
} from 'drizzle-orm'
import { db, reports } from '@/db'
import {
  PIN_EXCLUDED_CATEGORIES,
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

export async function listReportPins(
  status: ReportStatus,
): Promise<ReportPin[]> {
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
        notInArray(reports.category, [...PIN_EXCLUDED_CATEGORIES]),
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
}
