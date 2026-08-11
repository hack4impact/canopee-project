import type { Metadata } from 'next'
import { CarteView } from '@/components/carte-view'
import { MapAccessFallback } from '@/components/map-access-fallback'
import { getCurrentUserProfile } from '@/lib/auth/current-user'
import { canAccess } from '@/lib/auth/roles'
import { getActivePatrol } from '@/lib/patrols/queries'

export const metadata: Metadata = {
  title: 'Carte | Canopée',
  description:
    'Carte interactive des secteurs boisés de Laval avec navigation et géolocalisation.',
}

export const dynamic = 'force-dynamic'

export default async function CartePage() {
  const profile = await getCurrentUserProfile()
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  if (!profile || !canAccess(profile, 'volunteer')) {
    return <MapAccessFallback />
  }

  const activePatrol = await getActivePatrol(profile.id)

  return (
    <CarteView
      accessToken={accessToken}
      patrolStartedAt={activePatrol?.startedAt.toISOString() ?? null}
    />
  )
}
