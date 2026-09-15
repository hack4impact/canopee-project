'use client'

import { useCallback, useEffect, useState } from 'react'
import { areNotificationsEnabled } from '@/lib/patrols/live-activity'
import { isNativeApp } from '@/lib/patrols/native'

/**
 * Whether the patrol notification can actually be shown. Re-checked whenever the
 * app comes back to the foreground, so the prompt disappears on its own once the
 * user returns from the settings page having enabled it.
 *
 * Starts optimistic: the notice should never flash before the first check lands.
 */
export function useNotificationsEnabled(): boolean {
  const [enabled, setEnabled] = useState(true)

  const check = useCallback(() => {
    void areNotificationsEnabled().then(setEnabled)
  }, [])

  useEffect(() => {
    if (!isNativeApp()) {
      return
    }

    check()

    let remove = () => {}
    let cancelled = false

    void (async () => {
      const { App } = await import('@capacitor/app')
      const listener = await App.addListener(
        'appStateChange',
        ({ isActive }) => {
          if (isActive) {
            check()
          }
        },
      )

      if (cancelled) {
        void listener.remove()
        return
      }

      remove = () => void listener.remove()
    })()

    return () => {
      cancelled = true
      remove()
    }
  }, [check])

  return enabled
}
