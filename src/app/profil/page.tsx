import type { Metadata } from 'next'
import Link from 'next/link'
import { logout } from '@/app/login/actions'
import { BottomNav } from '@/components/bottom-nav'
import { requireApprovedUser } from '@/lib/auth/current-user'
import { isAdmin, type Role } from '@/lib/auth/roles'

export const metadata: Metadata = {
  title: 'Profil | Canopée',
  description: 'Votre compte et votre historique de patrouilles.',
}

export const dynamic = 'force-dynamic'

const ROLE_LABELS: Record<Role, string> = {
  volunteer: 'Bénévole',
  pro: 'Professionnel',
  admin: 'Administrateur',
}

const CARD =
  'rounded-2xl border border-canopee-forest/10 bg-white/70 px-5 py-4 shadow-sm'

export default async function ProfilPage() {
  const profile = await requireApprovedUser()

  return (
    <div className="flex min-h-dvh w-full flex-col bg-canopee-cream">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-10 pb-32 sm:px-6">
        <h1 className="font-heading text-2xl text-canopee-forest sm:text-3xl">
          Profil
        </h1>

        <div className={`flex flex-col gap-1 ${CARD}`}>
          <span className="font-heading text-base text-canopee-forest">
            {profile.email}
          </span>
          <span className="text-sm text-canopee-forest/70">
            {ROLE_LABELS[profile.role]}
          </span>
        </div>

        <nav className="flex flex-col gap-3">
          <Link
            href="/patrouilles"
            className={`flex items-center justify-between gap-4 text-canopee-forest transition-colors hover:border-canopee-green/40 ${CARD}`}
          >
            <span className="font-heading text-base">Mes patrouilles</span>
            <span className="text-sm text-canopee-forest/70">
              Historique et trajets
            </span>
          </Link>

          {isAdmin(profile) && (
            <Link
              href="/admin/volunteers"
              className={`flex items-center justify-between gap-4 text-canopee-forest transition-colors hover:border-canopee-green/40 ${CARD}`}
            >
              <span className="font-heading text-base">
                Examiner les demandes
              </span>
              <span className="text-sm text-canopee-forest/70">
                Comptes en attente
              </span>
            </Link>
          )}
        </nav>

        <form action={logout}>
          <button
            type="submit"
            className="text-sm text-canopee-forest/70 underline underline-offset-4 hover:text-canopee-coral-dark"
          >
            Se déconnecter
          </button>
        </form>
      </main>

      <BottomNav />
    </div>
  )
}
