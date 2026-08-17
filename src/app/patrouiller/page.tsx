import type { Metadata } from 'next'
import { BaseMap } from '@/components/base-map'
import { BottomNav } from '@/components/bottom-nav'
import { PatrolControls } from '@/components/patrol-controls'
import { requireApprovedUser } from '@/lib/auth/current-user'
import { getActivePatrol } from '@/lib/patrols/queries'

export const metadata: Metadata = {
  title: 'Patrouiller | Canopée',
  description: 'Démarrez une patrouille et enregistrez votre trajet.',
}

export const dynamic = 'force-dynamic'

export default async function PatrouillerPage() {
  const profile = await requireApprovedUser()
  const activePatrol = await getActivePatrol(profile.id)

  return (
    <div className="relative flex h-dvh w-full flex-col">
      <BaseMap
        accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        className="h-dvh w-full"
      />

      <div className="absolute top-6 left-1/2 z-40 -translate-x-1/2">
        <PatrolControls
          startedAt={activePatrol?.startedAt.toISOString() ?? null}
        />
      </div>

      <BottomNav />
    </div>
  )
}
