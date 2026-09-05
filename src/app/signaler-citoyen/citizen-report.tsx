'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ReportFlow } from '@/app/(map)/signaler/report-flow'

export function CitizenReport() {
  const router = useRouter()

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
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-canopee-forest p-4 font-sans sm:p-6">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-canopee-lime/20 blur-3xl" />
        <div className="absolute -right-32 -bottom-32 h-[28rem] w-[28rem] rounded-full bg-canopee-sky/20 blur-3xl" />
        <div className="absolute top-1/3 right-[12%] h-44 w-44 rounded-full bg-canopee-green/25 blur-2xl" />
      </div>

      <div className="relative z-10 flex h-[min(40rem,calc(100dvh-2rem))] w-full max-w-md flex-col gap-2 rounded-2xl bg-white px-4 py-4 shadow-2xl shadow-black/30 ring-1 ring-canopee-forest/10 sm:px-5 sm:py-5">
        <header className="flex shrink-0 items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <h1 className="font-heading text-2xl text-canopee-forest sm:text-3xl">
              Signaler
            </h1>
          </div>

          <Link
            href="/"
            aria-label="Fermer"
            className="inline-flex shrink-0 touch-manipulation items-center justify-center rounded-lg p-1.5 text-canopee-forest/60 transition-colors hover:bg-canopee-green/10 hover:text-canopee-forest focus-visible:ring-2 focus-visible:ring-canopee-green/40 focus-visible:outline-none"
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
          </Link>
        </header>

        <div className="flex min-h-0 flex-1 flex-col justify-center">
          <ReportFlow photoRequired={false} citizen />
        </div>
      </div>
    </div>
  )
}
