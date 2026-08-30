import type { Metadata } from 'next'
import Link from 'next/link'
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
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-36 sm:px-6">
        <header className="flex items-start justify-between gap-4">
          <h1 className="font-heading text-3xl text-canopee-forest">
            Gestion des membres
          </h1>

          <Link
            href="/profil"
            className="inline-flex shrink-0 items-center rounded-xl bg-canopee-forest px-3 py-2 text-xs font-extrabold text-canopee-cream transition-colors hover:bg-canopee-green focus-visible:ring-2 focus-visible:ring-canopee-lime focus-visible:outline-none"
          >
            Profil
          </Link>
        </header>

        <MemberList members={members} />
      </main>

      <BottomNav />
    </div>
  )
}
