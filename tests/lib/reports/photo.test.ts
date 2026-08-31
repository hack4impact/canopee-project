import { describe, expect, it } from 'vitest'
import { photoExtension, reportPhotoPath } from '@/lib/reports/photo'

const AUTH_USER_ID = '11111111-2222-3333-4444-555555555555'
const NOW = new Date('2026-08-18T15:04:05.000Z')

describe('photoExtension', () => {
  it('maps the accepted types', () => {
    expect(photoExtension('image/jpeg')).toBe('jpg')
    expect(photoExtension('image/png')).toBe('png')
    expect(photoExtension('image/webp')).toBe('webp')
  })

  it('returns null for a type the bucket does not accept', () => {
    expect(photoExtension('image/heic')).toBeNull()
    expect(photoExtension('application/pdf')).toBeNull()
  })
})

describe('reportPhotoPath', () => {
  it('puts the owner first so the policy can be narrowed later', () => {
    const path = reportPhotoPath(AUTH_USER_ID, 'image/jpeg', NOW, 'abc123')

    expect(path).toBe(`${AUTH_USER_ID}/${NOW.getTime()}-abc123.jpg`)
  })

  it('takes the extension from the type, not from any filename', () => {
    const path = reportPhotoPath(AUTH_USER_ID, 'image/png', NOW, 'abc123')

    expect(path?.endsWith('.png')).toBe(true)
  })

  it('refuses to build a path for an unaccepted type', () => {
    expect(
      reportPhotoPath(AUTH_USER_ID, 'image/heic', NOW, 'abc123'),
    ).toBeNull()
  })

  it('gives two photos in the same millisecond different paths', () => {
    const first = reportPhotoPath(AUTH_USER_ID, 'image/jpeg', NOW, 'aaa')
    const second = reportPhotoPath(AUTH_USER_ID, 'image/jpeg', NOW, 'bbb')

    expect(first).not.toBe(second)
  })
})
