'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { SplashScreen as Splash } from '@capacitor/splash-screen'

export function SplashScreen() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return
    }

    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        void Splash.hide()
      })
    })

    return () => cancelAnimationFrame(frame)
  }, [])

  return null
}
