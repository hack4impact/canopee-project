import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import {
  appendEvent,
  clearEvents,
  readEvents,
  type DebugEvent,
} from '@/lib/patrols/point-queue'

const PREFIX = '[patrol]'

export const DEBUG_FILE = 'patrol-debug.txt'

let pending: string[] = []

function formatEvent(event: DebugEvent): string {
  return `${event.at} ${event.kind} ${
    event.detail ? JSON.stringify(event.detail) : ''
  }`
}

function isNative(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform()
}

export function debugLog(kind: string, detail?: Record<string, unknown>): void {
  const at = new Date().toISOString()
  const event: DebugEvent = { at, kind, detail }

  console.log(`${PREFIX} ${kind}`, detail ? JSON.stringify(detail) : '')

  pending.push(formatEvent(event))

  void appendEvent(event).catch((cause) => {
    console.warn(`${PREFIX} could not persist event`, kind, cause)
  })
}

export function describeError(cause: unknown): Record<string, unknown> {
  if (cause instanceof Error) {
    return { name: cause.name, message: cause.message }
  }

  return { value: String(cause) }
}

export async function flushDebugFile(): Promise<void> {
  if (!isNative() || pending.length === 0) {
    return
  }

  const data = `${pending.join('\n')}\n`

  pending = []

  try {
    await Filesystem.appendFile({
      path: DEBUG_FILE,
      directory: Directory.External,
      data,
      encoding: Encoding.UTF8,
    })
  } catch (cause) {
    console.warn(`${PREFIX} could not append to ${DEBUG_FILE}`, cause)
  }
}

export async function startDebugFile(): Promise<void> {
  if (!isNative()) {
    return
  }

  const header = `\n===== session ${new Date().toISOString()} =====\n`

  try {
    await Filesystem.appendFile({
      path: DEBUG_FILE,
      directory: Directory.External,
      data: header,
      encoding: Encoding.UTF8,
    })
  } catch {
    try {
      await Filesystem.writeFile({
        path: DEBUG_FILE,
        directory: Directory.External,
        data: header,
        encoding: Encoding.UTF8,
        recursive: true,
      })
    } catch (cause) {
      console.warn(`${PREFIX} could not create ${DEBUG_FILE}`, cause)
    }
  }
}

export async function readDebugFile(): Promise<string> {
  if (!isNative()) {
    return ''
  }

  try {
    const file = await Filesystem.readFile({
      path: DEBUG_FILE,
      directory: Directory.External,
      encoding: Encoding.UTF8,
    })

    return typeof file.data === 'string' ? file.data : ''
  } catch (cause) {
    console.warn(`${PREFIX} could not read ${DEBUG_FILE}`, cause)
    return ''
  }
}

export async function clearDebugFile(): Promise<void> {
  if (!isNative()) {
    return
  }

  pending = []

  try {
    await Filesystem.deleteFile({
      path: DEBUG_FILE,
      directory: Directory.External,
    })
  } catch (cause) {
    console.warn(`${PREFIX} could not delete ${DEBUG_FILE}`, cause)
  }
}

export async function dumpDebugEvents(): Promise<DebugEvent[]> {
  const events = await readEvents()

  console.log(`${PREFIX} ===== ${events.length} stored events =====`)

  for (const event of events) {
    console.log(`${PREFIX} ${formatEvent(event)}`)
  }

  console.log(`${PREFIX} ===== end of dump =====`)

  return events
}

export function installDebugBridge(): void {
  if (typeof window === 'undefined') {
    return
  }

  Object.assign(window, {
    __patrol: {
      dump: dumpDebugEvents,
      events: readEvents,
      clear: clearEvents,
      file: readDebugFile,
      flush: flushDebugFile,
      clearFile: clearDebugFile,
    },
  })
}
