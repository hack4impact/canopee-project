import type { Metadata } from 'next'
import { CarteView } from '@/components/carte-view'
import { MapAccessFallback } from '@/components/map-access-fallback'
import { getCurrentUserProfile } from '@/lib/auth/current-user'
import { canAccess } from '@/lib/auth/roles'

export const metadata: Metadata = {
  title: 'Carte | Canopée',
  description:
    'Carte interactive des secteurs boisés de Laval avec navigation et géolocalisation.',
}

export const dynamic = 'force-dynamic'

export default async function CartePage() {
  const profile = await getCurrentUserProfile()
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  if (!canAccess(profile, 'volunteer')) {
    return <MapAccessFallback />
  }

  return <CarteView accessToken={accessToken} />
}
