import Image from 'next/image'
import Link from 'next/link'
import type { Metadata, Viewport } from 'next'
import { redirect } from 'next/navigation'
import { PatrolPicto } from '@/components/patrol-picto'
import { getCurrentUserProfile } from '@/lib/auth/current-user'
import { CITIZEN_REPORT_ROUTE } from '@/lib/auth/routes'

export const metadata: Metadata = {
  title: 'Canopée',
  description: 'Signalez un problème ou connectez-vous pour patrouiller.',
}

export const viewport: Viewport = {
  themeColor: '#004523',
}

export const dynamic = 'force-dynamic'

const CARD =
  'group flex w-full touch-manipulation items-center gap-4 rounded-2xl border border-transparent px-4 py-5 text-left shadow-sm transition-[border-color,background-color,transform] duration-150 ease-out focus-visible:ring-2 focus-visible:outline-none active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100'

const CHIP =
  'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl transition-colors duration-150'

export default async function RootPage() {
  const profile = await getCurrentUserProfile()

  if (profile) {
    redirect('/carte')
  }

  return (
    <div className="relative flex min-h-dvh flex-1 flex-col items-center justify-center overflow-hidden bg-canopee-forest px-6 py-16 font-sans">
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
            Bienvenue
          </h1>
          <p className="text-center text-sm text-canopee-forest/80">
            Qui êtes-vous ?
          </p>
        </header>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href={CITIZEN_REPORT_ROUTE}
            className={`${CARD} bg-canopee-coral/10 hover:border-canopee-coral hover:bg-canopee-coral/20 focus-visible:ring-canopee-coral/40`}
          >
            <span
              className={`${CHIP} bg-canopee-coral/10 text-canopee-coral group-hover:bg-canopee-coral group-hover:text-white group-focus-visible:bg-canopee-coral group-focus-visible:text-white`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8"
                aria-hidden="true"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block font-heading text-xl text-canopee-forest">
                Je suis un citoyen
              </span>
              <span className="block text-sm text-canopee-forest/70">
                Signaler un problème, sans créer de compte
              </span>
            </span>
          </Link>

          <Link
            href="/login"
            className={`${CARD} bg-canopee-green/10 hover:border-canopee-green hover:bg-canopee-green/20 focus-visible:ring-canopee-green/40`}
          >
            <span
              className={`${CHIP} bg-canopee-green/10 text-canopee-green group-hover:bg-canopee-green group-hover:text-white group-focus-visible:bg-canopee-green group-focus-visible:text-white`}
            >
              <PatrolPicto name="hiker" className="h-7 w-7" />
            </span>
            <span className="min-w-0">
              <span className="block font-heading text-xl text-canopee-forest">
                Je suis bénévole ou patrouilleur
              </span>
              <span className="block text-sm text-canopee-forest/70">
                Se connecter pour patrouiller et signaler
              </span>
            </span>
          </Link>
        </div>
      </main>
    </div>
  )
}
