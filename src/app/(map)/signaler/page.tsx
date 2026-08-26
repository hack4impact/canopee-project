import type { Metadata } from 'next'
import { requireApprovedUser } from '@/lib/auth/current-user'
import { ReportOverlay } from './report-overlay'

export const metadata: Metadata = {
  title: 'Signaler | Canopée',
  description: 'Signalez un problème observé sur le terrain.',
}

export const dynamic = 'force-dynamic'

export default async function SignalerPage() {
  const profile = await requireApprovedUser()

  return <ReportOverlay photoRequired={profile.role !== 'admin'} />
}
