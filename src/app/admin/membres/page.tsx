import type { Metadata } from 'next'
import { BackButton } from '@/components/back-button'
import { BottomNav } from '@/components/bottom-nav'
import { requireAdmin } from '@/lib/auth/current-user'
import { listMembers } from './actions'
import { MemberList } from './member-list'

export const metadata: Metadata = {
  title: 'Gestion des membres | Canopée',
  description: 'Gérer les rôles et les comptes approuvés.',
}

export const dynamic = 'force-dynamic'

export default async function AdminMembersPage() {
  const admin = await requireAdmin()
  const members = (await listMembers()).filter(
    (member) => member.id !== admin.id,
  )

  return (
    <div className="flex min-h-dvh w-full flex-col bg-canopee-cream">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pb-36 sm:px-6">
        <header className="sticky top-0 z-30 -mx-4 bg-canopee-cream/95 px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-3 backdrop-blur-sm sm:-mx-6 sm:px-6 flex items-start gap-3">
          <BackButton fallback="/profil" />
          <h1 className="font-heading text-3xl text-canopee-forest">
            Gestion des membres
          </h1>
        </header>

        <MemberList members={members} />
      </main>

      <BottomNav />
    </div>
  )
}
