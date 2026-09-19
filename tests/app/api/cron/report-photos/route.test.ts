import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { selectLimit, updateSet, updateWhere, remove, uploadToDrive } =
  vi.hoisted(() => ({
    selectLimit: vi.fn(),
    updateSet: vi.fn(),
    updateWhere: vi.fn(),
    remove: vi.fn(),
    uploadToDrive: vi.fn(),
  }))

vi.mock('@/db', () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => ({ limit: selectLimit }) }),
    }),
    update: () => ({
      set: (values: unknown) => {
        updateSet(values)
        return { where: updateWhere }
      },
    }),
  },
  reports: {},
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    storage: { from: () => ({ remove }) },
  }),
}))

vi.mock('@/lib/reports/google-drive', () => ({
  uploadReportPhotoToDrive: uploadToDrive,
}))

const { GET } = await import('@/app/api/cron/report-photos/route')

const originalEnv = { ...process.env }

beforeEach(() => {
  process.env.CRON_SECRET = 'expected-secret'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
  remove.mockResolvedValue({ error: null })
  updateWhere.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.clearAllMocks()
  process.env = { ...originalEnv }
})

function requestWith(authorization?: string) {
  return new Request('http://localhost/api/cron/report-photos', {
    headers: authorization ? { authorization } : {},
  })
}

const expiredReport = {
  id: 'report-1',
  eventNumber: 42,
  photoPath: 'citizen/1755000000000-uuid.jpg',
  drivePhotoUrl: 'https://drive.google.com/file/d/abc/view',
  createdAt: new Date('2026-08-01T00:00:00Z'),
}

describe('GET /api/cron/report-photos', () => {
  it('returns 401 when CRON_SECRET is missing', async () => {
    delete process.env.CRON_SECRET

    const response = await GET(requestWith())

    expect(response.status).toBe(401)
    expect(selectLimit).not.toHaveBeenCalled()
  })

  it('returns 401 when the bearer token is wrong', async () => {
    const response = await GET(requestWith('Bearer other-secret'))

    expect(response.status).toBe(401)
    expect(selectLimit).not.toHaveBeenCalled()
  })

  it('deletes an expired photo already copied to Drive', async () => {
    selectLimit.mockResolvedValue([expiredReport])

    const response = await GET(requestWith('Bearer expected-secret'))

    expect(await response.json()).toEqual({ deleted: 1, failed: 0 })
    expect(uploadToDrive).not.toHaveBeenCalled()
    expect(remove).toHaveBeenCalledWith([expiredReport.photoPath])
    expect(updateSet).toHaveBeenCalledWith({
      photoUrl: null,
      drivePhotoUrl: expiredReport.drivePhotoUrl,
    })
  })

  it('copies the photo to Drive before deleting it when the link is missing', async () => {
    selectLimit.mockResolvedValue([{ ...expiredReport, drivePhotoUrl: null }])
    uploadToDrive.mockResolvedValue('https://drive.google.com/file/d/new/view')

    const response = await GET(requestWith('Bearer expected-secret'))

    expect(await response.json()).toEqual({ deleted: 1, failed: 0 })
    expect(uploadToDrive).toHaveBeenCalledWith(
      expiredReport.photoPath,
      expiredReport.eventNumber,
      expiredReport.createdAt,
    )
    expect(updateSet).toHaveBeenCalledWith({
      photoUrl: null,
      drivePhotoUrl: 'https://drive.google.com/file/d/new/view',
    })
  })

  it('keeps the photo when the Drive copy fails', async () => {
    selectLimit.mockResolvedValue([{ ...expiredReport, drivePhotoUrl: null }])
    uploadToDrive.mockRejectedValue(new Error('Drive down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await GET(requestWith('Bearer expected-secret'))

    expect(await response.json()).toEqual({ deleted: 0, failed: 1 })
    expect(remove).not.toHaveBeenCalled()
    expect(updateSet).not.toHaveBeenCalled()
  })
})
