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

const TOKEN_ENDPOINT = '/api/patrols/upload-token'

const NATIVE_ENDPOINT = '/api/patrol-points/native'

const TOKEN_REFRESH_MS = 15 * 60_000

let received = 0

let lastReceivedAtMs: number | null = null

let refreshTimer: ReturnType<typeof setInterval> | null = null

async function fetchUploadToken(): Promise<string | null> {
  try {
    const response = await fetch(TOKEN_ENDPOINT, { redirect: 'manual' })

    if (!response.ok) {
      debugLog('native.token.rejected', { status: response.status })
      return null
    }

    const { token } = (await response.json()) as { token?: string }

    return typeof token === 'string' && token.length > 0 ? token : null
  } catch (cause) {
    debugLog('native.token.failed', describeError(cause))
    return null
  }
}

function nativeUploadOptions(token: string | null) {
  if (!token) {
    return {}
  }

  return {
    url: new URL(NATIVE_ENDPOINT, window.location.origin).toString(),
    headers: { Authorization: `Bearer ${token}` },
  }
}

function startTokenRefresh(): void {
  stopTokenRefresh()

  refreshTimer = setInterval(() => {
    void (async () => {
      const token = await fetchUploadToken()

      if (!token) {
        return
      }

      try {
        await BackgroundGeolocation.updateHeaders({
          headers: { Authorization: `Bearer ${token}` },
        })
        debugLog('native.token.refreshed')
      } catch (cause) {
        debugLog('native.token.refresh.failed', describeError(cause))
      }
    })()
  }, TOKEN_REFRESH_MS)
}

function stopTokenRefresh(): void {
  if (refreshTimer !== null) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

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

export async function flushNativeQueue(): Promise<void> {
  if (!isNativeApp()) {
    return
  }

  const token = await fetchUploadToken()

  if (!token) {
    return
  }

  try {
    await BackgroundGeolocation.updateHeaders({
      headers: { Authorization: `Bearer ${token}` },
    })
    debugLog('native.flush.requested')
  } catch (cause) {
    debugLog('native.flush.failed', describeError(cause))
  }
}

export async function startNativeWatch(
  onPoint: (point: RecordedPoint, accuracy: number | null) => void,
  onError: (error: Error) => void,
): Promise<void> {
  received = 0
  lastReceivedAtMs = null

  const token = await fetchUploadToken()
  const options = { ...START_OPTIONS, ...nativeUploadOptions(token) }

  debugLog('native.start.requested', {
    options: START_OPTIONS,
    nativeUpload: token !== null,
  })

  try {
    const permissions = await BackgroundGeolocation.checkPermissions()
    debugLog('native.permissions', { ...permissions })
  } catch (cause) {
    debugLog('native.permissions.failed', describeError(cause))
  }

  await BackgroundGeolocation.start(options, (location, error) => {
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

    onPoint(toNativeRecordedPoint(location), location.accuracy)
  })

  if (token) {
    startTokenRefresh()
  }

  debugLog('native.start.ok')
}

export async function stopNativeWatch(): Promise<void> {
  debugLog('native.stop.requested', { received })

  stopTokenRefresh()

  try {
    await BackgroundGeolocation.stop()
    debugLog('native.stop.ok')
  } catch (cause) {
    debugLog('native.stop.failed', describeError(cause))
  }
}
