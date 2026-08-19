'use client'

import { useEffect } from 'react'

const RUNWAY_PX = 140

export function SafariScrollRunway() {
  useEffect(() => {
    if (!window.matchMedia('(max-width: 640px)').matches) {
      return
    }

    if (window.scrollY >= RUNWAY_PX) {
      return
    }

    window.scrollTo({ top: RUNWAY_PX, left: 0, behavior: 'instant' })
  }, [])

  return (
    <div
      aria-hidden
      className="pointer-events-none shrink-0 sm:hidden"
      style={{ height: `calc(100dvh + ${RUNWAY_PX}px)` }}
    />
  )
}
