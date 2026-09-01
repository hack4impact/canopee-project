import type { Metadata } from 'next'
import { HeatmapLayer } from '@/components/heatmap-layer'
import { MapFiltersProvider } from '@/components/map-filters-provider'
import { ObservationsLayer } from '@/components/observations-layer'
import { ReportPinsLayer } from '@/components/report-pins-layer'
import { TopPanel } from '@/components/top-panel'
import { UserLocation } from '@/components/user-location'
import { getCurrentUserProfile } from '@/lib/auth/current-user'
import { canAccess } from '@/lib/auth/roles'
import { canViewObservations } from '@/lib/observations/access'

export const metadata: Metadata = {
  title: 'Carte | Canopée',
  description: 'Fréquentation des secteurs boisés de Laval.',
}

export const dynamic = 'force-dynamic'

export default async function CartePage() {
  const profile = await getCurrentUserProfile()
  const observations = canViewObservations(profile)
  const canOpenDetail = canAccess(profile, 'pro')

  return (
    <MapFiltersProvider observations={observations}>
      <TopPanel />
      <HeatmapLayer />
      <ReportPinsLayer canOpenDetail={canOpenDetail} />
      {observations && <ObservationsLayer />}
      <UserLocation
        flyToOnLocate={false}
        compassClassName="absolute top-[calc(1rem+env(safe-area-inset-top))] left-4 z-10"
      />
    </MapFiltersProvider>
  )
}
