import Image from 'next/image'
import Link from 'next/link'
import type { Metadata, Viewport } from 'next'
import { redirect } from 'next/navigation'
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

const TITLE = 'min-w-0 flex-1 font-heading text-xl text-canopee-forest'

function Arrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-5 w-5 shrink-0 transition-transform duration-150 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 ${className ?? ''}`}
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

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
        </header>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href={CITIZEN_REPORT_ROUTE}
            className={`${CARD} bg-canopee-coral/10 hover:border-canopee-coral hover:bg-canopee-coral/20 focus-visible:ring-canopee-coral/40`}
          >
            <span className={TITLE}>Je suis un citoyen</span>
            <Arrow className="text-canopee-coral" />
          </Link>

          <Link
            href="/login"
            className={`${CARD} bg-canopee-green/10 hover:border-canopee-green hover:bg-canopee-green/20 focus-visible:ring-canopee-green/40`}
          >
            <span className={TITLE}>Je suis bénévole ou patrouilleur</span>
            <Arrow className="text-canopee-green" />
          </Link>
        </div>
      </main>
    </div>
  )
}
