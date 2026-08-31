'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('Route error boundary caught', error)
  }, [error])

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-canopee-forest px-6 py-16 font-sans">
      <main className="w-full max-w-sm rounded-3xl bg-canopee-cream p-8 text-center shadow-2xl shadow-black/40 sm:p-10">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-canopee-forest">
          Une erreur est survenue
        </h1>
        <p className="mt-4 text-sm text-canopee-forest/80">
          Cette page n&apos;a pas pu être affichée. Vérifiez votre connexion,
          puis réessayez.
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="mt-8 w-full rounded-lg bg-canopee-green px-4 py-2.5 font-bold text-white shadow-sm transition-[background-color] duration-150 ease-out hover:bg-canopee-forest"
        >
          Réessayer
        </button>
        <Link
          href="/carte"
          className="mt-4 inline-block text-sm text-canopee-forest/70 underline underline-offset-4"
        >
          Retour à la carte
        </Link>
      </main>
    </div>
  )
}
