const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** A duration as `HH:MM:SS`. Hours are uncapped: a forgotten patrol reads `26:14:03`. */
export function formatElapsed(milliseconds: number): string {
  // Phone and server clocks disagree, so a patrol can look like it starts in
  // the future.
  const total = Math.max(0, milliseconds)

  const hours = Math.floor(total / HOUR)
  const minutes = Math.floor((total % HOUR) / MINUTE)
  const seconds = Math.floor((total % MINUTE) / SECOND)

  return [hours, minutes, seconds].map(pad).join(':')
}
