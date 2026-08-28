'use client'

import { useSyncExternalStore } from 'react'
import { Capacitor } from '@capacitor/core'

const subscribe = () => () => {}

export function SafariEdgeTint() {
  const native = useSyncExternalStore(
    subscribe,
    () => Capacitor.isNativePlatform(),
    () => false,
  )

  if (native) {
    return null
  }

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[env(safe-area-inset-top)] bg-canopee-cream"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 h-[env(safe-area-inset-bottom)] bg-canopee-cream"
      />
    </>
  )
}
