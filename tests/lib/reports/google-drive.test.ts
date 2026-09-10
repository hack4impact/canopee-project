import { beforeEach, describe, expect, it, vi } from 'vitest'

const files = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
}))

const permissions = vi.hoisted(() => ({ create: vi.fn() }))

const DRIVE_LINK = 'https://drive.google.com/file/d/file-id/view'

vi.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: vi.fn(function MockGoogleAuth() {
        return {}
      }),
    },
    drive: vi.fn(function MockDrive() {
      return { files, permissions }
    }),
  },
}))

describe('uploadReportPhotoToDrive', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    process.env.GOOGLE_DRIVE_FOLDER_ID = 'bad-folder-id'
    process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID = 'shared-drive-id'
    process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS = JSON.stringify({
      client_email: 'service@example.com',
      private_key:
        '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----',
    })
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'

    files.list.mockReset()
    files.create.mockReset()
    permissions.create.mockReset()
    permissions.create.mockResolvedValue({})

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(Buffer.from('fake-image')),
      headers: { get: vi.fn().mockReturnValue('image/jpeg') },
    }) as unknown as typeof fetch
  })

  it('falls back to the root drive folder when the configured parent folder is unavailable', async () => {
    files.list
      .mockResolvedValueOnce({ data: { files: [] } })
      .mockResolvedValueOnce({ data: { files: [] } })
    files.create
      .mockRejectedValueOnce({ code: 404, message: 'File not found' })
      .mockResolvedValueOnce({ data: { id: 'year-id' } })
      .mockResolvedValueOnce({ data: { id: 'month-id' } })
      .mockResolvedValueOnce({
        data: { id: 'file-id', webViewLink: DRIVE_LINK },
      })

    const { uploadReportPhotoToDrive } =
      await import('@/lib/reports/google-drive')

    await expect(
      uploadReportPhotoToDrive(
        'reports/photo.jpg',
        42,
        new Date('2026-09-04T12:00:00Z'),
      ),
    ).resolves.toBe(DRIVE_LINK)

    expect(files.create).toHaveBeenCalledTimes(4)
    expect(files.create.mock.calls[0][0].requestBody.parents).toEqual([
      'bad-folder-id',
    ])
    expect(files.create.mock.calls[0][0].requestBody.driveId).toBe(
      'shared-drive-id',
    )
    expect(files.create.mock.calls[1][0].requestBody.parents).toBeUndefined()
    expect(files.create.mock.calls[1][0].requestBody.driveId).toBe(
      'shared-drive-id',
    )
  })

  it('lists existing folders from all drives when checking for reuse', async () => {
    files.list.mockResolvedValue({
      data: { files: [{ id: 'existing-folder' }] },
    })
    files.create.mockResolvedValue({
      data: { id: 'file-id', webViewLink: DRIVE_LINK },
    })

    const { uploadReportPhotoToDrive } =
      await import('@/lib/reports/google-drive')

    await expect(
      uploadReportPhotoToDrive(
        'reports/photo.jpg',
        42,
        new Date('2026-09-04T12:00:00Z'),
      ),
    ).resolves.toBe(DRIVE_LINK)

    expect(files.list).toHaveBeenCalledWith(
      expect.objectContaining({
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
      }),
    )
    expect(files.create).toHaveBeenCalledTimes(1)
  })
})
