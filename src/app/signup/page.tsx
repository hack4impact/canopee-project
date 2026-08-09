import Image from 'next/image'
import type { Metadata } from 'next'
import { ViewTransition } from 'react'
import { SignupForm } from './signup-form'

export const metadata: Metadata = {
  title: 'Créer un compte | Canopée',
}

export default function SignupPage() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col items-center justify-center overflow-hidden bg-canopee-forest px-6 py-16 font-sans">
      {/* Décor Canopée */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-canopee-lime/20 blur-3xl" />
        <div className="absolute -right-32 -bottom-32 h-[28rem] w-[28rem] rounded-full bg-canopee-sky/20 blur-3xl" />
        <div className="absolute top-1/3 right-[12%] h-44 w-44 rounded-full bg-canopee-green/25 blur-2xl" />
      </div>

      {/* Même `name` que sur /login : le navigateur transforme la carte au
          lieu de la détruire et de la recréer. */}
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
              Créez votre compte
            </h1>
            <p className="text-center text-sm text-canopee-forest/80">
              Les nouveaux comptes sont créés en tant que bénévoles et doivent
              être approuvés par un administrateur.
            </p>
          </header>

          <div className="mt-8">
            <SignupForm />
          </div>
        </main>
      </ViewTransition>
    </div>
  )
}
