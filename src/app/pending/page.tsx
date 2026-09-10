import Image from 'next/image'
import type { Metadata } from 'next'
import { ViewTransition } from 'react'
import { redirect } from 'next/navigation'
import { logout } from '@/app/login/actions'
import { ForestBackground } from '@/components/forest-background'
import { getCurrentUserProfile } from '@/lib/auth/current-user'
import { isApproved, isRejected } from '@/lib/auth/roles'

export const metadata: Metadata = {
  title: 'Approbation en attente | Canopée',
}

export const dynamic = 'force-dynamic'

const PENDING_COPY = {
  heading: "Votre compte est en attente d'approbation",
  body: "Un administrateur examine chaque nouveau compte. Vous recevrez un courriel dès qu'il sera approuvé.",
}

const REJECTED_COPY = {
  heading: "Votre compte n'a pas été approuvé",
  body: "Un administrateur a examiné votre compte et ne l'a pas approuvé. Si vous pensez qu'il s'agit d'une erreur, répondez au courriel que vous avez reçu ou contactez Canopée.",
}

export default async function PendingPage() {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    redirect('/login')
  }

  if (isApproved(profile)) {
    redirect('/')
  }

  const copy = isRejected(profile) ? REJECTED_COPY : PENDING_COPY

  return (
    <div className="relative flex min-h-full flex-1 flex-col items-center justify-center overflow-hidden bg-canopee-forest px-6 py-16 font-sans">
      <ForestBackground />

      <ViewTransition name="auth-card" share="morph">
        <main className="relative z-10 w-full max-w-sm rounded-3xl bg-canopee-cream p-8 shadow-2xl shadow-black/40 sm:p-10">
          <header className="flex flex-col items-center gap-3 text-center">
            <Image
              src="/logos/canopee-logo.png"
              alt="Canopée"
              width={260}
              height={140}
              priority
              className="h-auto w-64"
            />
            <h1 className="font-heading text-3xl font-bold tracking-tight text-canopee-forest">
              {copy.heading}
            </h1>
          </header>

          <p className="mt-6 text-center text-sm text-canopee-forest/80">
            {copy.body}
          </p>

          <p className="mt-6 text-center text-sm text-canopee-forest/70">
            Connecté en tant que{' '}
            <span className="font-medium text-canopee-forest">
              {profile.email}
            </span>
          </p>

          <form action={logout} className="mt-8">
            <button
              type="submit"
              className="w-full rounded-lg bg-canopee-green px-4 py-2.5 font-bold text-white shadow-sm transition-[background-color] duration-150 ease-out hover:bg-canopee-forest"
            >
              Se déconnecter
            </button>
          </form>
        </main>
      </ViewTransition>
    </div>
  )
}
