'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db, reports } from '@/db'
import { requireApprovedAccess } from '@/lib/auth/current-user'
import { archiveReportPhoto } from '@/lib/reports/google-drive'
import { REPORT_PHOTO_BUCKET } from '@/lib/reports/photo'
import { createClient } from '@/lib/supabase/server'

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

  const [updated] = await db
    .update(reports)
    .set({ resolvedAt })
    .where(and(eq(reports.id, reportId), isNull(reports.resolvedAt)))
    .returning({ id: reports.id })

  if (!updated) {
    return { message: 'Signalement introuvable ou déjà résolu.' }
  }

  revalidatePath('/reports')
  return {}
}
