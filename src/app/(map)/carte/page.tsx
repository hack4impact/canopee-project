import type { Metadata } from 'next'
import { HeatmapLayer } from '@/components/heatmap-layer'
import { ObservationsLayer } from '@/components/observations-layer'
import { ReportPinsLayer } from '@/components/report-pins-layer'
import { UserLocation } from '@/components/user-location'
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
      <ReportPinsLayer />
      {canViewObservations(profile) && <ObservationsLayer />}
      <UserLocation
        flyToOnLocate={false}
        compassClassName="absolute top-4 left-4 z-10"
      />
    </>
  )
}
