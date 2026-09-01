import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  select,
  update,
  returning,
  requireApprovedAccess,
  archiveReportPhoto,
  remove,
  revalidatePath,
  sendResolved,
} = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
  returning: vi.fn(),
  requireApprovedAccess: vi.fn(),
  archiveReportPhoto: vi.fn(),
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
    resolvedAt: 'resolvedAt',
    category: 'category',
    createdAt: 'createdAt',
    userId: 'userId',
    reporterEmail: 'reporterEmail',
  },
  users: { email: 'email' },
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
vi.mock('@/lib/plunk', () => ({ sendReportResolvedEmail: sendResolved }))

import { ANONYMISED_REPORTER } from '@/lib/auth/delete-account'
import { resolveReport } from '@/lib/reports/actions'

const REPORT_ID = '123e4567-e89b-12d3-a456-426614174000'

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
  archiveReportPhoto.mockResolvedValue(undefined)
  remove.mockResolvedValue({ error: null })
  returning.mockResolvedValue(resolvedRow())
  sendResolved.mockResolvedValue(true)
  update.mockReturnValue({
    set: vi.fn(() => ({ where: vi.fn(() => ({ returning })) })),
  })
})

describe('resolveReport', () => {
  it('archives before deleting the Supabase object and resolving', async () => {
    setReportLookup([
      { id: REPORT_ID, eventNumber: 42, photoPath: 'user/photo.jpg' },
    ])
    await expect(resolveReport({}, makeFormData())).resolves.toEqual({})
    expect(archiveReportPhoto).toHaveBeenCalledWith(
      'user/photo.jpg',
      42,
      expect.any(Date),
    )
    expect(remove).toHaveBeenCalledWith(['user/photo.jpg'])
    expect(archiveReportPhoto.mock.invocationCallOrder[0]).toBeLessThan(
      remove.mock.invocationCallOrder[0],
    )
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(
      returning.mock.invocationCallOrder[0],
    )
  })

  it('does not delete from Supabase or resolve when Drive archival fails', async () => {
    setReportLookup([
      { id: REPORT_ID, eventNumber: 42, photoPath: 'user/photo.jpg' },
    ])
    archiveReportPhoto.mockRejectedValue(new Error('Drive unavailable'))
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
    expect(revalidatePath).toHaveBeenCalledWith('/reports')
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
