import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  select,
  update,
  returning,
  requireApprovedAccess,
  uploadReportPhotoToDrive,
  set,
  remove,
  revalidatePath,
  sendResolved,
} = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
  returning: vi.fn(),
  requireApprovedAccess: vi.fn(),
  uploadReportPhotoToDrive: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
  revalidatePath: vi.fn(),
  sendResolved: vi.fn(),
}))

vi.mock('@/db', () => ({
  db: { select, update },
  reports: {
    id: 'id',
    eventNumber: 'eventNumber',
    photoUrl: 'photoUrl',
    drivePhotoUrl: 'drivePhotoUrl',
    resolvedAt: 'resolvedAt',
    category: 'category',
    createdAt: 'createdAt',
    userId: 'userId',
    reporterEmail: 'reporterEmail',
  },
  users: { email: 'email' },
}))
vi.mock('@/lib/auth/current-user', () => ({ requireApprovedAccess }))
vi.mock('@/lib/reports/google-drive', () => ({ uploadReportPhotoToDrive }))
vi.mock('next/cache', () => ({ revalidatePath }))
vi.mock('drizzle-orm', () => ({ and: vi.fn(), eq: vi.fn(), isNull: vi.fn() }))
vi.mock('@/lib/reports/photo', () => ({ REPORT_PHOTO_BUCKET: 'report-photos' }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    storage: { from: vi.fn(() => ({ remove })) },
  })),
}))
vi.mock('@/lib/plunk', () => ({ sendReportResolvedEmail: sendResolved }))

import { ANONYMISED_REPORTER } from '@/lib/auth/delete-account'
import { resolveReport } from '@/lib/reports/actions'

const REPORT_ID = '123e4567-e89b-12d3-a456-426614174000'
const DRIVE_LINK = 'https://drive.google.com/file/d/abc123/view'

function makeFormData(id: string = REPORT_ID): FormData {
  const data = new FormData()
  data.set('reportId', id)
  return data
}

function resolvedRow(overrides: Record<string, unknown> = {}) {
  return [
    {
      eventNumber: 42,
      category: 'fallen_tree',
      createdAt: new Date('2026-03-04T15:00:00Z'),
      userId: null,
      reporterEmail: 'citoyen@example.com',
      ...overrides,
    },
  ]
}

function query(rows: unknown[]) {
  return { from: vi.fn(() => ({ where: vi.fn().mockResolvedValue(rows) })) }
}

function setReportLookup(rows: unknown[]) {
  select.mockReturnValueOnce(query(rows))
}

beforeEach(() => {
  vi.clearAllMocks()
  requireApprovedAccess.mockResolvedValue(undefined)
  uploadReportPhotoToDrive.mockResolvedValue(DRIVE_LINK)
  remove.mockResolvedValue({ error: null })
  returning.mockResolvedValue(resolvedRow())
  sendResolved.mockResolvedValue(true)
  set.mockReturnValue({ where: vi.fn(() => ({ returning })) })
  update.mockReturnValue({ set })
})

describe('resolveReport', () => {
  it('archives before deleting the Supabase object and resolving', async () => {
    setReportLookup([
      { id: REPORT_ID, eventNumber: 42, photoPath: 'user/photo.jpg' },
    ])
    await expect(resolveReport({}, makeFormData())).resolves.toEqual({})
    expect(uploadReportPhotoToDrive).toHaveBeenCalledWith(
      'user/photo.jpg',
      42,
      expect.any(Date),
    )
    expect(remove).toHaveBeenCalledWith(['user/photo.jpg'])
    expect(uploadReportPhotoToDrive.mock.invocationCallOrder[0]).toBeLessThan(
      remove.mock.invocationCallOrder[0],
    )
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(
      returning.mock.invocationCallOrder[0],
    )
  })

  it('stores the Drive link on the resolved report', async () => {
    setReportLookup([
      { id: REPORT_ID, eventNumber: 42, photoPath: 'user/photo.jpg' },
    ])
    await resolveReport({}, makeFormData())
    expect(set).toHaveBeenCalledWith({
      resolvedAt: expect.any(Date),
      drivePhotoUrl: DRIVE_LINK,
    })
  })

  it('reuses the link uploaded at submission instead of copying twice', async () => {
    setReportLookup([
      {
        id: REPORT_ID,
        eventNumber: 42,
        photoPath: 'user/photo.jpg',
        drivePhotoUrl: DRIVE_LINK,
      },
    ])
    await resolveReport({}, makeFormData())
    expect(uploadReportPhotoToDrive).not.toHaveBeenCalled()
    expect(remove).toHaveBeenCalledWith(['user/photo.jpg'])
    expect(set).toHaveBeenCalledWith({
      resolvedAt: expect.any(Date),
      drivePhotoUrl: DRIVE_LINK,
    })
  })

  it('does not delete from Supabase or resolve when Drive archival fails', async () => {
    setReportLookup([
      { id: REPORT_ID, eventNumber: 42, photoPath: 'user/photo.jpg' },
    ])
    uploadReportPhotoToDrive.mockRejectedValue(new Error('Drive unavailable'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(resolveReport({}, makeFormData())).resolves.toEqual({
      message:
        'La photo n’a pas pu être archivée. Le signalement reste en attente.',
    })
    expect(remove).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects an identifier that is not a uuid', async () => {
    const result = await resolveReport({}, makeFormData('not-a-uuid'))
    expect(result.message).toBe('Identifiant de signalement invalide.')
    expect(returning).not.toHaveBeenCalled()
    expect(sendResolved).not.toHaveBeenCalled()
  })

  it('sends exactly one email to the citizen who filed the report', async () => {
    setReportLookup([{ id: REPORT_ID, eventNumber: 42, photoPath: null }])
    returning.mockResolvedValueOnce(resolvedRow())
    await expect(resolveReport({}, makeFormData())).resolves.toEqual({})
    expect(sendResolved).toHaveBeenCalledTimes(1)
    expect(sendResolved.mock.calls[0][0]).toBe('citoyen@example.com')
  })

  it('falls back to the account email when the report belongs to a user', async () => {
    setReportLookup([{ id: REPORT_ID, eventNumber: 42, photoPath: null }])
    returning.mockResolvedValueOnce(
      resolvedRow({ userId: 'a-user-id', reporterEmail: null }),
    )
    select.mockReturnValueOnce(query([{ email: 'benevole@example.com' }]))
    await resolveReport({}, makeFormData())
    expect(sendResolved).toHaveBeenCalledTimes(1)
    expect(sendResolved.mock.calls[0][0]).toBe('benevole@example.com')
  })

  it('sends nothing when the report is already resolved', async () => {
    setReportLookup([])
    const result = await resolveReport({}, makeFormData())
    expect(result.message).toBe('Signalement introuvable ou déjà résolu.')
    expect(sendResolved).not.toHaveBeenCalled()
  })

  it('sends nothing when the reporter deleted their account', async () => {
    setReportLookup([{ id: REPORT_ID, eventNumber: 42, photoPath: null }])
    returning.mockResolvedValueOnce(
      resolvedRow({ reporterEmail: ANONYMISED_REPORTER }),
    )
    await expect(resolveReport({}, makeFormData())).resolves.toEqual({})
    expect(sendResolved).not.toHaveBeenCalled()
  })

  it('keeps the report resolved when the email fails', async () => {
    setReportLookup([{ id: REPORT_ID, eventNumber: 42, photoPath: null }])
    returning.mockResolvedValueOnce(resolvedRow())
    sendResolved.mockRejectedValueOnce(new Error('boom'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(resolveReport({}, makeFormData())).resolves.toEqual({})
    expect(revalidatePath).toHaveBeenCalledWith('/admin/issues')
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
