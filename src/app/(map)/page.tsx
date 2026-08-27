import type { Metadata } from 'next'
import { TopPanel } from '@/components/top-panel'
import { UserLocation } from '@/components/user-location'

export const metadata: Metadata = {
  title: 'Accueil | Canopée',
  description: 'Carte de Laval et accès à vos patrouilles.',
}

export const dynamic = 'force-dynamic'

export default function AccueilPage() {
  return (
    <>
      <TopPanel />
      <UserLocation compassClassName="absolute top-[calc(7rem+env(safe-area-inset-top))] right-4 z-10" />
    </>
  )
}
