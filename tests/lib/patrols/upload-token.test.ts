import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createUploadToken,
  isUploadTokenConfigured,
  readUploadToken,
} from '@/lib/patrols/upload-token'

const USER = '11111111-2222-3333-4444-555555555555'

const NOW = Date.parse('2026-08-27T12:00:00.000Z')

const HOUR = 60 * 60_000

describe('upload tokens', () => {
  beforeEach(() => {
    process.env.PATROL_UPLOAD_SECRET = 'test-secret'
  })

  afterEach(() => {
    delete process.env.PATROL_UPLOAD_SECRET
  })

  it('round trips the user it was issued to', () => {
    const token = createUploadToken(USER, NOW)

    expect(readUploadToken(token!, NOW)).toEqual({
      userId: USER,
      expiresAt: NOW + HOUR,
    })
  })

  it('rejects a token once it has expired', () => {
    const token = createUploadToken(USER, NOW)

    expect(readUploadToken(token!, NOW + HOUR + 1)).toBeNull()
  })

  it('rejects a tampered payload', () => {
    const token = createUploadToken(USER, NOW)
    const forged = Buffer.from(
      JSON.stringify({ userId: 'someone-else', expiresAt: NOW + HOUR }),
      'utf8',
    ).toString('base64url')

    expect(readUploadToken(`${forged}.${token!.split('.')[1]}`, NOW)).toBeNull()
  })

  it('rejects a token signed with another secret', () => {
    const token = createUploadToken(USER, NOW)

    process.env.PATROL_UPLOAD_SECRET = 'different-secret'

    expect(readUploadToken(token!, NOW)).toBeNull()
  })

  it('rejects malformed tokens', () => {
    expect(readUploadToken('nonsense', NOW)).toBeNull()
    expect(readUploadToken('', NOW)).toBeNull()
  })

  it('issues nothing when no secret is configured', () => {
    delete process.env.PATROL_UPLOAD_SECRET

    expect(isUploadTokenConfigured()).toBe(false)
    expect(createUploadToken(USER, NOW)).toBeNull()
  })
})
