import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  select,
  update,
  returning,
  requireApprovedAccess,
  archiveReportPhoto,
  remove,
  revalidatePath,
} = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
  returning: vi.fn(),
  requireApprovedAccess: vi.fn(),
  archiveReportPhoto: vi.fn(),
  remove: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/db', () => ({
  db: { select, update },
  reports: {
    id: 'id',
    eventNumber: 'eventNumber',
    photoUrl: 'photoUrl',
    resolvedAt: 'resolvedAt',
  },
}))
vi.mock('@/lib/auth/current-user', () => ({ requireApprovedAccess }))
vi.mock('@/lib/reports/google-drive', () => ({ archiveReportPhoto }))
vi.mock('next/cache', () => ({ revalidatePath }))
vi.mock('drizzle-orm', () => ({ and: vi.fn(), eq: vi.fn(), isNull: vi.fn() }))
vi.mock('@/lib/reports/photo', () => ({ REPORT_PHOTO_BUCKET: 'report-photos' }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    storage: { from: vi.fn(() => ({ remove })) },
  })),
}))

const { resolveReport } = await import('@/lib/reports/actions')

const REPORT_ID = '123e4567-e89b-12d3-a456-426614174000'

beforeEach(() => {
  vi.clearAllMocks()
  requireApprovedAccess.mockResolvedValue(undefined)
  archiveReportPhoto.mockResolvedValue(undefined)
  remove.mockResolvedValue({ error: null })
  returning.mockResolvedValue([{ id: REPORT_ID }])
  update.mockReturnValue({
    set: vi.fn(() => ({ where: vi.fn(() => ({ returning })) })),
  })
})

describe('resolveReport photo archival', () => {
  it('archives before deleting the Supabase object and resolving', async () => {
    select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi
          .fn()
          .mockResolvedValue([
            { id: REPORT_ID, eventNumber: 42, photoPath: 'user/photo.jpg' },
          ]),
      })),
    })

    const formData = new FormData()
    formData.set('reportId', REPORT_ID)

    await expect(resolveReport({}, formData)).resolves.toEqual({})

    expect(archiveReportPhoto).toHaveBeenCalledWith(
      'user/photo.jpg',
      42,
      expect.any(Date),
    )
    expect(remove).toHaveBeenCalledWith(['user/photo.jpg'])
    expect(returning).toHaveBeenCalled()
    expect(archiveReportPhoto.mock.invocationCallOrder[0]).toBeLessThan(
      remove.mock.invocationCallOrder[0],
    )
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(
      returning.mock.invocationCallOrder[0],
    )
  })

  it('does not delete from Supabase or resolve when Drive archival fails', async () => {
    select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi
          .fn()
          .mockResolvedValue([
            { id: REPORT_ID, eventNumber: 42, photoPath: 'user/photo.jpg' },
          ]),
      })),
    })
    archiveReportPhoto.mockRejectedValue(new Error('Drive unavailable'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const formData = new FormData()
    formData.set('reportId', REPORT_ID)

    await expect(resolveReport({}, formData)).resolves.toEqual({
      message:
        'La photo n’a pas pu être archivée. Le signalement reste en attente.',
    })

    expect(remove).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })
})
