import type { Metadata } from 'next'
import { HeatmapLayer } from '@/components/heatmap-layer'
import { ObservationsLayer } from '@/components/observations-layer'
import { getCurrentUserProfile } from '@/lib/auth/current-user'
import { canAccess } from '@/lib/auth/roles'

export const metadata: Metadata = {
  title: 'Carte | Canopée',
  description: 'Fréquentation des secteurs boisés de Laval.',
}

export const dynamic = 'force-dynamic'

export default async function CartePage() {
  const profile = await getCurrentUserProfile()

  return (
    <>
      <HeatmapLayer />
      {canAccess(profile, 'pro') && <ObservationsLayer />}
    </>
  )
}
