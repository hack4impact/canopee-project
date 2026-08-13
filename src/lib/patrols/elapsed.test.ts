import { describe, expect, it } from 'vitest'
import { formatElapsed } from './elapsed'

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE

describe('formatElapsed', () => {
  it('renders a patrol that just started as zero', () => {
    expect(formatElapsed(0)).toBe('00:00:00')
  })

  it('counts whole seconds, dropping the remainder', () => {
    expect(formatElapsed(1 * SECOND)).toBe('00:00:01')
    expect(formatElapsed(1 * SECOND + 999)).toBe('00:00:01')
  })

  it('rolls seconds over into minutes', () => {
    expect(formatElapsed(59 * SECOND)).toBe('00:00:59')
    expect(formatElapsed(60 * SECOND)).toBe('00:01:00')
  })

  it('rolls minutes over into hours', () => {
    expect(formatElapsed(59 * MINUTE + 59 * SECOND)).toBe('00:59:59')
    expect(formatElapsed(60 * MINUTE)).toBe('01:00:00')
  })

  it('pads every field to two digits', () => {
    expect(formatElapsed(HOUR + 2 * MINUTE + 3 * SECOND)).toBe('01:02:03')
  })

  it('keeps counting past a day instead of wrapping', () => {
    expect(formatElapsed(26 * HOUR + 14 * MINUTE + 3 * SECOND)).toBe('26:14:03')
  })

  it('clamps a negative duration to zero, for clock skew between phone and server', () => {
    expect(formatElapsed(-1)).toBe('00:00:00')
    expect(formatElapsed(-30 * SECOND)).toBe('00:00:00')
  })
})
