import { Capacitor } from '@capacitor/core'
import {
  BackgroundGeolocation,
  type Location as NativeLocation,
} from '@capgo/background-geolocation'
import { POINT_INTERVAL_MS, type RecordedPoint } from '@/lib/patrols/points'

export function isNativeApp(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform()
}

export function toNativeRecordedPoint(location: NativeLocation): RecordedPoint {
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    recordedAt: new Date(location.time ?? Date.now()).toISOString(),
  }
}

export async function startNativeWatch(
  onPoint: (point: RecordedPoint) => void,
  onError: (error: Error) => void,
): Promise<void> {
  await BackgroundGeolocation.start(
    {
      backgroundTitle: 'Patrouille en cours',
      backgroundMessage: 'Enregistrement de votre trajet.',
      requestPermissions: true,
      distanceFilter: 0,
      minIntervalMs: POINT_INTERVAL_MS,
      stale: false,
    },
    (location, error) => {
      if (error) {
        onError(error)
        return
      }

      if (location) {
        onPoint(toNativeRecordedPoint(location))
      }
    },
  )
}

export async function stopNativeWatch(): Promise<void> {
  await BackgroundGeolocation.stop()
}
