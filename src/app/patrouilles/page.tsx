import type { Metadata } from 'next'
import { PatrouilleView } from '@/components/patrouille-view'
import { requireApprovedUser } from '@/lib/auth/current-user'
import { getActivePatrol } from '@/lib/patrols/queries'

export const metadata: Metadata = {
  title: 'Patrouiller | Canopée',
  description: 'Carte de Laval pour enregistrer vos patrouilles.',
}

export const dynamic = 'force-dynamic'

export default async function PatrouillePage() {
  const profile = await requireApprovedUser()
  const activePatrol = await getActivePatrol(profile.id)

  return (
    <PatrouilleView
      accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      patrolStartedAt={activePatrol?.startedAt.toISOString() ?? null}
    />
  )
}
