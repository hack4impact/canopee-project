'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db, reports } from '@/db'
import { requireApprovedAccess } from '@/lib/auth/current-user'

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

  const [updated] = await db
    .update(reports)
    .set({ resolvedAt: new Date() })
    .where(and(eq(reports.id, reportId), isNull(reports.resolvedAt)))
    .returning({ id: reports.id })

  if (!updated) {
    return { message: 'Signalement introuvable ou déjà résolu.' }
  }

  revalidatePath('/reports')
  return {}
}
