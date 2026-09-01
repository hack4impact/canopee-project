'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db, reports, users } from '@/db'
import { requireApprovedAccess } from '@/lib/auth/current-user'
import { archiveReportPhoto } from '@/lib/reports/google-drive'
import { REPORT_PHOTO_BUCKET } from '@/lib/reports/photo'
import { createClient } from '@/lib/supabase/server'
import { ANONYMISED_REPORTER } from '@/lib/auth/delete-account'
import { sendReportResolvedEmail } from '@/lib/plunk'
import type { ReportCategory } from '@/lib/reports/categories'

export type ResolveReportState = {
  message?: string
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

export async function resolveReport(
  _prevState: ResolveReportState,
  formData: FormData,
): Promise<ResolveReportState> {
  await requireApprovedAccess('pro')

  const reportId = String(formData.get('reportId') ?? '')

  if (!isUuid(reportId)) {
    return { message: 'Identifiant de signalement invalide.' }
  }

  const [report] = await db
    .select({
      id: reports.id,
      eventNumber: reports.eventNumber,
      photoPath: reports.photoUrl,
    })
    .from(reports)
    .where(and(eq(reports.id, reportId), isNull(reports.resolvedAt)))

  if (!report) {
    return { message: 'Signalement introuvable ou déjà résolu.' }
  }

  const resolvedAt = new Date()

  if (report.photoPath) {
    try {
      await archiveReportPhoto(report.photoPath, report.eventNumber, resolvedAt)

      const supabase = await createClient()
      const { error } = await supabase.storage
        .from(REPORT_PHOTO_BUCKET)
        .remove([report.photoPath])

      if (error) throw error
    } catch (cause) {
      console.error('Failed to archive report photo', cause)
      return {
        message:
          'La photo n’a pas pu être archivée. Le signalement reste en attente.',
      }
    }
  }

  const resolvedAt = new Date()

  const [updated] = await db
    .update(reports)
    .set({ resolvedAt })
    .where(and(eq(reports.id, reportId), isNull(reports.resolvedAt)))
    .returning({
      eventNumber: reports.eventNumber,
      category: reports.category,
      createdAt: reports.createdAt,
      userId: reports.userId,
      reporterEmail: reports.reporterEmail,
    })

  if (!updated) {
    return { message: 'Signalement introuvable ou déjà résolu.' }
  }

  await notifyReporter(updated, resolvedAt)

  revalidatePath('/reports')
  return {}
}

async function accountEmail(userId: string | null): Promise<string | null> {
  if (!userId) {
    return null
  }

  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))

  return user?.email ?? null
}

async function notifyReporter(
  report: {
    eventNumber: number
    category: ReportCategory
    createdAt: Date
    userId: string | null
    reporterEmail: string | null
  },
  resolvedAt: Date,
) {
  try {
    const email = report.reporterEmail ?? (await accountEmail(report.userId))

    if (!email || email === ANONYMISED_REPORTER) {
      return
    }

    await sendReportResolvedEmail(email, {
      eventNumber: report.eventNumber,
      category: report.category,
      createdAt: report.createdAt,
      resolvedAt,
    })
  } catch (error) {
    console.error('Resolved-report notification failed:', error)
  }
}
