'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'

export function DeepLink() {
  const router = useRouter()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return
    }

    let remove: (() => void) | null = null

    void (async () => {
      const { App } = await import('@capacitor/app')

      const handle = await App.addListener('appUrlOpen', ({ url }) => {
        let target: URL

        try {
          target = new URL(url)
        } catch {
          return
        }

        if (target.origin !== window.location.origin) {
          return
        }

        router.replace(`${target.pathname}${target.search}`)
      })

      remove = () => void handle.remove()
    })()

    return () => remove?.()
  }, [router])

  return null
}
