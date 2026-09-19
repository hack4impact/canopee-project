import { and, eq, isNotNull, lt } from 'drizzle-orm'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { db, reports } from '@/db'
import { uploadReportPhotoToDrive } from '@/lib/reports/google-drive'
import { REPORT_PHOTO_BUCKET } from '@/lib/reports/photo'

const RETENTION_MS = 14 * 24 * 60 * 60 * 1000
const BATCH_SIZE = 100

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET

  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error('[report-photos] SUPABASE_SERVICE_ROLE_KEY is not configured')
    return new Response('Storage is not configured', { status: 500 })
  }

  const cutoff = new Date(Date.now() - RETENTION_MS)

  const expired = await db
    .select({
      id: reports.id,
      eventNumber: reports.eventNumber,
      photoPath: reports.photoUrl,
      drivePhotoUrl: reports.drivePhotoUrl,
      createdAt: reports.createdAt,
    })
    .from(reports)
    .where(and(isNotNull(reports.photoUrl), lt(reports.createdAt, cutoff)))
    .limit(BATCH_SIZE)

  const supabase = createAdminClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let deleted = 0
  let failed = 0

  for (const report of expired) {
    if (!report.photoPath) continue

    try {
      const drivePhotoUrl =
        report.drivePhotoUrl ??
        (await uploadReportPhotoToDrive(
          report.photoPath,
          report.eventNumber,
          report.createdAt,
        ))

      const { error } = await supabase.storage
        .from(REPORT_PHOTO_BUCKET)
        .remove([report.photoPath])

      if (error) throw error

      await db
        .update(reports)
        .set({ photoUrl: null, drivePhotoUrl })
        .where(eq(reports.id, report.id))

      deleted++
    } catch (cause) {
      failed++
      console.error(
        `[report-photos] Failed to delete the photo of report ${report.id}`,
        cause,
      )
    }
  }

  console.log(`[report-photos] ${deleted} photo(s) deleted, ${failed} failed.`)

  return Response.json({ deleted, failed })
}
