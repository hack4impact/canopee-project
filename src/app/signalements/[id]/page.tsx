import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ReportSummary } from '@/components/report-summary'
import { requireApprovedUser } from '@/lib/auth/current-user'
import { getReportPhotoUrl } from '@/lib/reports/photo'
import { getReportById } from '@/lib/reports/queries'

export const metadata: Metadata = {
  title: 'Mon signalement | Canopée',
  description: 'Détail de votre signalement et suivi de sa résolution.',
}

export const dynamic = 'force-dynamic'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function SignalementPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const profile = await requireApprovedUser()

  const { id } = await params

  if (!UUID_PATTERN.test(id)) {
    notFound()
  }

  const report = await getReportById(id, profile.id)

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
      backFallback="/signalements"
    />
  )
}
