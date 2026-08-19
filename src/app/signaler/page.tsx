import type { Metadata } from 'next'
import { BottomNav } from '@/components/bottom-nav'
import { requireApprovedUser } from '@/lib/auth/current-user'
import { ReportForm } from './report-form'

export const metadata: Metadata = {
  title: 'Signaler | Canopée',
  description: 'Signalez un problème observé sur le terrain.',
}

export const dynamic = 'force-dynamic'

export default async function SignalerPage() {
  await requireApprovedUser()

  return (
    <div className="flex min-h-dvh w-full flex-col bg-canopee-cream">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-10 pb-32 sm:px-6">
        <header className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl text-canopee-forest sm:text-3xl">
            Signaler
          </h1>
          <p className="text-sm text-canopee-forest/70">
            Le signalement est enregistré à l&apos;endroit où vous vous trouvez.
          </p>
        </header>

        <div className="rounded-2xl border border-canopee-forest/10 bg-white/70 px-5 py-5 shadow-sm">
          <ReportForm />
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
