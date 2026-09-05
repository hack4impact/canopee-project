'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { drainQueuedReports, pendingReportCount } from '@/lib/reports/send'
import { ReportFlow } from './report-flow'

export function ReportOverlay({ photoRequired }: { photoRequired: boolean }) {
  const router = useRouter()
  const [pendingReports, setPendingReports] = useState(0)
  const [contentHeight, setContentHeight] = useState<number | null>(null)
  const [filling, setFilling] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = contentRef.current

    if (!element) {
      return
    }

    const observer = new ResizeObserver(([entry]) => {
      setContentHeight(entry.contentRect.height)
    })

    observer.observe(element)

    return () => observer.disconnect()
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
    <div className="fixed inset-0 z-[70] flex animate-in items-center justify-center overflow-hidden bg-canopee-forest/40 fade-in p-4 backdrop-blur-sm duration-200 motion-reduce:animate-none sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Signaler"
        className={`relative flex max-h-[calc(100dvh-2rem)] w-full animate-dock-in flex-col gap-1.5 rounded-2xl bg-white px-4 py-4 shadow-2xl shadow-black/30 ring-1 ring-canopee-forest/10 transition-[max-width] duration-300 ease-out motion-reduce:animate-none motion-reduce:transition-none sm:px-5 sm:py-5 ${
          filling ? 'max-w-xl' : 'max-w-sm'
        }`}
      >
        <header className="flex shrink-0 items-start justify-between gap-2">
          <h1 className="font-heading text-2xl leading-tight text-canopee-forest sm:text-3xl">
            Signaler
          </h1>

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

        <div
          style={{ height: contentHeight ?? undefined }}
          className="scroll-visible max-h-[min(38rem,calc(100dvh-9rem))] overflow-y-auto transition-[height] duration-300 ease-out motion-reduce:transition-none"
        >
          <div ref={contentRef}>
            <ReportFlow
              photoRequired={photoRequired}
              onFillingChange={setFilling}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
