import { registerPlugin } from '@capacitor/core'
import { debugLog, describeError } from '@/lib/patrols/debug'
import { isNativeApp } from '@/lib/patrols/native'

export type PatrolActivityCommand = 'toggle' | 'stop'

type CommandEvent = { action: PatrolActivityCommand }

type PatrolActivityPlugin = {
  isSupported(): Promise<{ supported: boolean }>
  start(options: {
    startedAt: number
    distanceMetres: number
    paused: boolean
    elapsedSeconds: number
    route: number[]
  }): Promise<{ started: boolean }>
  update(options: {
    distanceMetres: number
    paused: boolean
    elapsedSeconds: number
    route: number[]
  }): Promise<void>
  end(): Promise<void>
  openSettings(): Promise<void>
  addListener(
    event: 'command',
    handler: (data: CommandEvent) => void,
  ): Promise<{ remove: () => Promise<void> }>
}

const PatrolActivity = registerPlugin<PatrolActivityPlugin>('PatrolActivity')

// Reports whether the patrol notification can actually be shown. On Android this
// is areNotificationsEnabled(), which stays false when the user denied the
// permission or switched notifications off, and no permission dialog will help.
export async function areNotificationsEnabled(): Promise<boolean> {
  if (!isNativeApp()) {
    return true
  }

  try {
    const { supported } = await PatrolActivity.isSupported()
    debugLog('activity.supported', { supported })
    return supported
  } catch (cause) {
    debugLog('activity.supported.failed', describeError(cause))
    return true
  }
}

export async function openNotificationSettings(): Promise<void> {
  if (!isNativeApp()) {
    return
  }

  try {
    await PatrolActivity.openSettings()
  } catch (cause) {
    debugLog('activity.settings.failed', describeError(cause))
  }
}

export async function startLiveActivity(options: {
  startedAt: number
  distanceMetres: number
  paused: boolean
  elapsedSeconds: number
  route: number[]
}): Promise<void> {
  if (!isNativeApp()) {
    return
  }

  try {
    const { started } = await PatrolActivity.start(options)
    debugLog('activity.start', { started })
  } catch (cause) {
    debugLog('activity.start.failed', describeError(cause))
  }
}

export async function updateLiveActivity(options: {
  distanceMetres: number
  paused: boolean
  elapsedSeconds: number
  route: number[]
}): Promise<void> {
  if (!isNativeApp()) {
    return
  }

  try {
    await PatrolActivity.update(options)
  } catch (cause) {
    debugLog('activity.update.failed', describeError(cause))
  }
}

export async function endLiveActivity(): Promise<void> {
  if (!isNativeApp()) {
    return
  }

  try {
    await PatrolActivity.end()
    debugLog('activity.end')
  } catch (cause) {
    debugLog('activity.end.failed', describeError(cause))
  }
}

export async function listenForActivityCommands(
  handler: (command: PatrolActivityCommand) => void,
): Promise<() => void> {
  if (!isNativeApp()) {
    return () => {}
  }

  try {
    const listener = await PatrolActivity.addListener(
      'command',
      ({ action }) => {
        debugLog('activity.command', { action })
        handler(action)
      },
    )

    return () => void listener.remove()
  } catch (cause) {
    debugLog('activity.listen.failed', describeError(cause))
    return () => {}
  }
}
