import { getCurrentUserProfile } from '@/lib/auth/current-user'
import { canAccess } from '@/lib/auth/roles'
import { csvFileName, reportsToCsv } from '@/lib/reports/csv'
import { listReportsForExport } from '@/lib/reports/queries'

export const dynamic = 'force-dynamic'

export async function GET() {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    return Response.json({ error: 'Not signed in.' }, { status: 401 })
  }

  if (!canAccess(profile, 'pro')) {
    return Response.json({ error: 'Insufficient role.' }, { status: 403 })
  }

  const reports = await listReportsForExport()

  return new Response(reportsToCsv(reports), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${csvFileName(new Date())}"`,
      'Cache-Control': 'no-store',
    },
  })
}
