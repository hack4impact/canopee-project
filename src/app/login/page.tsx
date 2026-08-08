import Image from 'next/image'
import type { Metadata } from 'next'
import { REDIRECT_PARAM, safeRedirectPath } from '@/lib/auth/routes'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Connexion | Canopée',
}

export default async function LoginPage(props: PageProps<'/login'>) {
  const requested = (await props.searchParams)[REDIRECT_PARAM]

  // A repeated query parameter arrives as an array, and there is no sensible
  // way to pick one of them, so anything but a single string falls back to the
  // default. `safeRedirectPath` rejects the rest.
  const redirectTo = safeRedirectPath(
    typeof requested === 'string' ? requested : undefined,
  )

  return (
    <div className="relative flex min-h-full flex-1 flex-col items-center justify-center overflow-hidden bg-canopee-forest px-6 py-16 font-sans">
      {/* Décor Canopée */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-canopee-lime/20 blur-3xl" />
        <div className="absolute -right-32 -bottom-32 h-[28rem] w-[28rem] rounded-full bg-canopee-sky/20 blur-3xl" />
        <div className="absolute top-1/3 right-[12%] h-44 w-44 rounded-full bg-canopee-green/25 blur-2xl" />
      </div>

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
            Connexion
          </h1>
        </header>

        <div className="mt-8">
          <LoginForm redirectTo={redirectTo} />
        </div>
      </main>
    </div>
  )
}
