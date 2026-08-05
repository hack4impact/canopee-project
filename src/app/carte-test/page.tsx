import type { Metadata } from 'next'
import Link from 'next/link'
import { MapboxMap } from '@/components/mapbox-map'

export const metadata: Metadata = {
  title: 'Carte de test | Canopée',
  description:
    'Page temporaire pour valider l’intégration Mapbox avec le style Outdoors.',
}

export default function CarteTestPage() {
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full flex-col gap-6 px-6 py-10">
        <header className="mx-auto flex w-full max-w-5xl flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
              Carte de test Mapbox
            </h1>
            <Link
              href="/"
              className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
            >
              Accueil
            </Link>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400">
            Page temporaire pour valider le style Outdoors et la vue par défaut
            sur les secteurs boisés de Laval.
          </p>
        </header>

        <MapboxMap
          accessToken={accessToken}
          className="mx-auto h-[70vh] w-full max-w-5xl overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800"
        />
      </main>
    </div>
  )
}
