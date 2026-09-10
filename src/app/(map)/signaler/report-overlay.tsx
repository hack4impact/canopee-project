'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { drainQueuedReports, pendingReportCount } from '@/lib/reports/send'
import { ReportFlow } from './report-flow'

export function ReportOverlay({ photoRequired }: { photoRequired: boolean }) {
  const router = useRouter()
  const [pendingReports, setPendingReports] = useState(0)
  const [filling, setFilling] = useState(false)
  const [back, setBack] = useState<{ run: () => void } | null>(null)

  const handleBackChange = useCallback((handler: (() => void) | null) => {
    setBack(handler ? { run: handler } : null)
  }, [])

  const drain = useCallback(() => {
    drainQueuedReports()
      .then(setPendingReports)
      .catch(() => setPendingReports(0))
  }, [])

  useEffect(() => {
    pendingReportCount()
      .then(setPendingReports)
      .catch(() => setPendingReports(0))

    drain()

    window.addEventListener('online', drain)

    return () => window.removeEventListener('online', drain)
  }, [drain])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        router.push('/carte')
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [router])

  return (
    <div className="safe-inset fixed inset-0 z-[70] flex animate-in items-center justify-center overflow-hidden bg-canopee-forest/40 fade-in backdrop-blur-sm duration-200 motion-reduce:animate-none">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Signaler"
        className={`relative flex max-h-full w-full min-h-0 animate-dock-in flex-col gap-1.5 overflow-visible rounded-2xl bg-white px-4 py-4 shadow-2xl shadow-black/30 ring-1 ring-canopee-forest/10 transition-[max-width] duration-300 ease-out motion-reduce:animate-none motion-reduce:transition-none sm:px-5 sm:py-5 ${
          filling
            ? 'max-w-[min(36rem,calc(100dvh_-_6rem))]'
            : 'max-w-[min(24rem,calc(100dvh_-_6rem))]'
        }`}
      >
        <header className="flex shrink-0 items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {back && (
              <button
                type="button"
                onClick={back.run}
                aria-label="Retour"
                className="inline-flex touch-manipulation shrink-0 items-center justify-center rounded-lg p-1.5 text-canopee-forest/60 transition-colors hover:bg-canopee-green/10 hover:text-canopee-forest focus-visible:ring-2 focus-visible:ring-canopee-green/40 focus-visible:outline-none"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="m12 19-7-7 7-7" />
                  <path d="M19 12H5" />
                </svg>
              </button>
            )}

            <h1 className="font-heading text-2xl leading-tight text-canopee-forest sm:text-3xl">
              Signaler
            </h1>
          </div>

          <button
            type="button"
            onClick={() => router.push('/carte')}
            aria-label="Fermer"
            className="inline-flex touch-manipulation shrink-0 items-center justify-center rounded-lg p-1.5 text-canopee-forest/60 transition-colors hover:bg-canopee-green/10 hover:text-canopee-forest focus-visible:ring-2 focus-visible:ring-canopee-green/40 focus-visible:outline-none"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        {pendingReports > 0 && (
          <p
            aria-live="polite"
            className="shrink-0 rounded-lg bg-canopee-green/10 px-3 py-2.5 text-sm font-medium text-canopee-forest"
          >
            {pendingReports === 1
              ? '1 signalement en attente d’envoi.'
              : `${pendingReports} signalements en attente d’envoi.`}
          </p>
        )}

        <ReportFlow
          photoRequired={photoRequired}
          onFillingChange={setFilling}
          onBackChange={handleBackChange}
        />
      </div>
    </div>
  )
}
