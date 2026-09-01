import Image from 'next/image'
import Link from 'next/link'
import type { Metadata, Viewport } from 'next'
import { ViewTransition } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ResetForm } from './reset-form'

export const metadata: Metadata = {
  title: 'Nouveau mot de passe | Canopée',
}

export const viewport: Viewport = {
  themeColor: '#004523',
}

export const dynamic = 'force-dynamic'

export default async function ResetPasswordPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="relative flex min-h-full flex-1 flex-col items-center justify-center overflow-hidden bg-canopee-forest px-6 py-16 font-sans">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-canopee-lime/20 blur-3xl" />
        <div className="absolute -right-32 -bottom-32 h-[28rem] w-[28rem] rounded-full bg-canopee-sky/20 blur-3xl" />
        <div className="absolute top-1/3 right-[12%] h-44 w-44 rounded-full bg-canopee-green/25 blur-2xl" />
      </div>

      <ViewTransition name="auth-card" share="morph">
        <main className="relative z-10 w-full max-w-sm rounded-3xl bg-canopee-cream p-8 shadow-2xl shadow-black/40 sm:p-10">
          <header className="flex flex-col items-center gap-3">
            <Image
              src="/logos/canopee-logo.png"
              alt="Canopée"
              width={260}
              height={140}
              priority
              className="h-auto w-40"
            />
            <h1 className="font-heading text-3xl font-bold tracking-tight text-canopee-forest">
              {user ? 'Nouveau mot de passe' : 'Lien expiré'}
            </h1>
          </header>

          {user ? (
            <div className="mt-8">
              <ResetForm />
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-4">
              <p className="text-center text-sm text-canopee-forest/80">
                Ce lien de réinitialisation n’est plus valide. Chaque lien ne
                sert qu’une fois.
              </p>

              <Link
                href="/login/forgot"
                className="inline-flex touch-manipulation items-center justify-center rounded-lg bg-canopee-green px-4 py-2.5 font-bold text-white shadow-sm transition-[background-color] duration-150 ease-out hover:bg-canopee-forest focus-visible:ring-2 focus-visible:ring-canopee-green/50 focus-visible:outline-none"
              >
                Demander un nouveau lien
              </Link>
            </div>
          )}
        </main>
      </ViewTransition>
    </div>
  )
}
