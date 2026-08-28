'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { drainQueuedReports, pendingReportCount } from '@/lib/reports/send'
import { ReportFlow } from './report-flow'

export function ReportOverlay({ photoRequired }: { photoRequired: boolean }) {
  const router = useRouter()
  const [pendingReports, setPendingReports] = useState(0)

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
        router.push('/')
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [router])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-canopee-forest/40 p-4 backdrop-blur-sm sm:p-6">
      <button
        type="button"
        aria-label="Fermer le signalement"
        onClick={() => router.push('/')}
        className="fixed inset-0 cursor-default"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Signaler"
        className="relative flex h-[min(40rem,calc(100dvh-2rem))] w-full max-w-md flex-col gap-2 rounded-2xl bg-white px-4 py-4 shadow-2xl shadow-black/30 ring-1 ring-canopee-forest/10 sm:px-5 sm:py-5"
      >
        <header className="flex shrink-0 items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl text-canopee-forest sm:text-3xl">
              Signaler
            </h1>
          </div>

          <button
            type="button"
            onClick={() => router.push('/')}
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

        <div className="flex min-h-0 flex-1 flex-col justify-center">
          <ReportFlow photoRequired={photoRequired} />
        </div>
      </div>
    </div>
  )
}
