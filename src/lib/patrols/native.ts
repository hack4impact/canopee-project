import { Capacitor } from '@capacitor/core'
import {
  BackgroundGeolocation,
  type Location as NativeLocation,
} from '@capgo/background-geolocation'
import { debugLog, describeError } from '@/lib/patrols/debug'
import { POINT_INTERVAL_MS, type RecordedPoint } from '@/lib/patrols/points'

const START_OPTIONS = {
  backgroundTitle: 'Patrouille en cours',
  backgroundMessage: 'Enregistrement de votre trajet.',
  requestPermissions: true,
  distanceFilter: 0,
  minIntervalMs: POINT_INTERVAL_MS,
  stale: false,
}

let received = 0

let lastReceivedAtMs: number | null = null

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
  received = 0
  lastReceivedAtMs = null

  debugLog('native.start.requested', { options: START_OPTIONS })

  try {
    const permissions = await BackgroundGeolocation.checkPermissions()
    debugLog('native.permissions', { ...permissions })
  } catch (cause) {
    debugLog('native.permissions.failed', describeError(cause))
  }

  await BackgroundGeolocation.start(START_OPTIONS, (location, error) => {
    if (error) {
      debugLog('native.error', {
        ...describeError(error),
        receivedSoFar: received,
      })

      onError(error)
      return
    }

    if (!location) {
      debugLog('native.empty', { receivedSoFar: received })
      return
    }

    const now = Date.now()

    received += 1

    debugLog('native.location', {
      n: received,
      lat: Number(location.latitude.toFixed(5)),
      lon: Number(location.longitude.toFixed(5)),
      accuracy: location.accuracy,
      fixTime: location.time,
      staleByMs: location.time === null ? null : now - location.time,
      sinceLastMs: lastReceivedAtMs === null ? null : now - lastReceivedAtMs,
    })

    lastReceivedAtMs = now

    onPoint(toNativeRecordedPoint(location))
  })

  debugLog('native.start.ok')
}

export async function stopNativeWatch(): Promise<void> {
  debugLog('native.stop.requested', { received })

  try {
    await BackgroundGeolocation.stop()
    debugLog('native.stop.ok')
  } catch (cause) {
    debugLog('native.stop.failed', describeError(cause))
  }
}
