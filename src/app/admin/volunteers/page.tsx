import type { Metadata } from 'next'
import { BackButton } from '@/components/back-button'
import { BottomNav } from '@/components/bottom-nav'
import { getPendingUsers } from './actions'
import { VolunteerQueue } from './volunteer-queue'

export const metadata: Metadata = {
  title: 'Comptes en attente | Canopée',
  description: 'Demandes de comptes à examiner.',
}

export const dynamic = 'force-dynamic'

export default async function AdminVolunteersPage() {
  const pendingUsers = await getPendingUsers()

  return (
    <div className="flex min-h-dvh w-full flex-col bg-canopee-cream">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pb-36 sm:px-6">
        <header className="sticky top-0 z-30 -mx-4 bg-canopee-cream/95 px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-3 backdrop-blur-sm sm:-mx-6 sm:px-6 flex items-start gap-3">
          <BackButton fallback="/profil" />
          <div className="flex flex-col gap-0.5">
            <h1 className="font-heading text-3xl text-canopee-forest">
              Comptes en attente
            </h1>
          </div>
        </header>

        <VolunteerQueue volunteers={pendingUsers} />
      </main>

      <BottomNav />
    </div>
  )
}
