import type { Metadata } from 'next'
import { HeatmapLayer } from '@/components/heatmap-layer'
import { ObservationsLayer } from '@/components/observations-layer'
import { getCurrentUserProfile } from '@/lib/auth/current-user'
import { canViewObservations } from '@/lib/observations/access'

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
      {canViewObservations(profile) && <ObservationsLayer />}
    </>
  )
}
