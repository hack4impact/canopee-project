'use client'

import { useEffect } from 'react'
import './globals.css'

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('Global error boundary caught', error)
  }, [error])

  return (
    <html lang="fr" className="h-full antialiased">
      <body className="flex min-h-full flex-col items-center justify-center bg-canopee-forest px-6 py-16">
        <main className="w-full max-w-sm rounded-3xl bg-canopee-cream p-8 text-center shadow-2xl shadow-black/40 sm:p-10">
          <h1 className="text-2xl font-bold tracking-tight text-canopee-forest">
            Canopée est momentanément indisponible
          </h1>
          <p className="mt-4 text-sm text-canopee-forest/80">
            L&apos;application n&apos;a pas pu démarrer. Réessayez dans un
            instant.
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="mt-8 w-full rounded-lg bg-canopee-green px-4 py-2.5 font-bold text-white shadow-sm transition-[background-color] duration-150 ease-out hover:bg-canopee-forest"
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  )
}
