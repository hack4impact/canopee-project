import { describe, expect, it } from 'vitest'
import { getGeolocationNotice } from './geolocation'

describe('getGeolocationNotice', () => {
  it('returns a non-blocking message when permission is denied', () => {
    const notice = getGeolocationNotice({ code: 1 })

    expect(notice.message).toContain('refusée')
    expect(notice.message).toContain('Laval')
  })

  it('returns a message when position is unavailable', () => {
    const notice = getGeolocationNotice({ code: 2 })

    expect(notice.message).toContain('indisponible')
  })

  it('returns a generic fallback for timeouts and unknown errors', () => {
    const notice = getGeolocationNotice({ code: 3 })

    expect(notice.message).toContain('Impossible')
  })
})
