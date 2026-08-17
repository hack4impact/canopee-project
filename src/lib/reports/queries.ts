import { and, asc, eq, gte, lte } from 'drizzle-orm'
import { db, reports } from '@/db'
import type { reportCategoryEnum } from '@/db/schema'

export type ReportCategory = (typeof reportCategoryEnum.enumValues)[number]

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  dangerous_tree: 'Arbre dangereux',
  damaged_infrastructure: 'Infrastructure endommagée',
  fauna_observation: 'Observation de faune',
  flora_observation: 'Observation de flore',
  unleashed_dog: 'Chien sans laisse',
}

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
