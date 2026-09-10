import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ReportSummary } from '@/components/report-summary'
import { ResolveReportButton } from '@/components/resolve-report-button'
import { requireApprovedAccess } from '@/lib/auth/current-user'
import { getReportPhotoUrl } from '@/lib/reports/photo'
import { getReportById } from '@/lib/reports/queries'

export const metadata: Metadata = {
  title: 'Signalement | Canopée',
  description: 'Détail du signalement et suivi de sa résolution.',
}

export const dynamic = 'force-dynamic'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const CARD = 'rounded-2xl border border-canopee-forest/10 bg-white/70 shadow-sm'

export default async function AdminIssuePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireApprovedAccess('pro')

  const { id } = await params

  if (!UUID_PATTERN.test(id)) {
    notFound()
  }

  const report = await getReportById(id)

  if (!report) {
    notFound()
  }

  const photoUrl = report.photoUrl
    ? await getReportPhotoUrl(report.photoUrl)
    : null

  return (
    <ReportSummary
      report={report}
      photoUrl={photoUrl}
      backFallback="/admin/issues"
      footer={
        report.resolvedAt !== null ? (
          <p className={`px-5 py-4 text-sm text-canopee-forest/70 ${CARD}`}>
            Signalement clos.
          </p>
        ) : (
          <ResolveReportButton
            reportId={report.id}
            resolved={false}
            fullWidth
          />
        )
      }
    />
  )
}
