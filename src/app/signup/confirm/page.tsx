import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ViewTransition } from 'react'

export const metadata: Metadata = {
  title: 'Confirmez votre courriel | Canopée',
}

export default async function SignupConfirmPage(
  props: PageProps<'/signup/confirm'>,
) {
  const email = (await props.searchParams).email
  const sentTo = typeof email === 'string' && email ? email : null

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
              Vérifiez votre courriel
            </h1>
          </header>

          <div className="mt-6 flex flex-col gap-4 text-center text-sm text-canopee-forest/80">
            <p>
              Un courriel de confirmation a été envoyé à{' '}
              <span className="font-medium text-canopee-forest">{sentTo}</span>.
            </p>
            <p>
              Cliquez sur le lien qu&apos;il contient pour activer votre compte.
            </p>
            <p>
              Si vous ne voyez pas le courriel, vérifiez vos courriels
              indésirables.
            </p>
          </div>

          <Link
            href="/login"
            className="mt-8 block rounded-lg bg-canopee-green px-4 py-2.5 text-center font-bold text-white shadow-sm transition-[background-color] duration-150 ease-out hover:bg-canopee-forest"
          >
            Aller à la connexion
          </Link>
        </main>
      </ViewTransition>
    </div>
  )
}
