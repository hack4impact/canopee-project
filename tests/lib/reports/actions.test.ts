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
const { returning, selectWhere, sendResolved, revalidatePath } = vi.hoisted(
  () => ({
    returning: vi.fn(),
    selectWhere: vi.fn(),
    sendResolved: vi.fn(),
    revalidatePath: vi.fn(),
  }),
)

vi.mock('drizzle-orm', () => ({
  and: (...args: unknown[]) => args,
  eq: (...args: unknown[]) => args,
  isNull: (...args: unknown[]) => args,
}))

vi.mock('@/db', () => ({
  db: {
    update: () => ({
      set: () => ({ where: () => ({ returning }) }),
    }),
    select: () => ({
      from: () => ({ where: selectWhere }),
    }),
  },
  reports: {},
  users: {},
}))

vi.mock('next/cache', () => ({ revalidatePath }))

vi.mock('@/lib/auth/current-user', () => ({
  requireApprovedAccess: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/plunk', () => ({ sendReportResolvedEmail: sendResolved }))

import { ANONYMISED_REPORTER } from '@/lib/auth/delete-account'
import { resolveReport } from '@/lib/reports/actions'

const REPORT_ID = '11111111-2222-3333-4444-555555555555'

function formData(id: string = REPORT_ID): FormData {
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

describe('resolveReport', () => {
  beforeEach(() => {
    returning.mockReset()
    selectWhere.mockReset()
    sendResolved.mockReset()
    revalidatePath.mockReset()
    sendResolved.mockResolvedValue(true)
  })

  it('rejects an identifier that is not a uuid', async () => {
    const result = await resolveReport({}, formData('not-a-uuid'))

    expect(result.message).toBe('Identifiant de signalement invalide.')
    expect(returning).not.toHaveBeenCalled()
    expect(sendResolved).not.toHaveBeenCalled()
  })

  it('sends exactly one email to the citizen who filed the report', async () => {
    returning.mockResolvedValueOnce(resolvedRow())

    const result = await resolveReport({}, formData())

    expect(result).toEqual({})
    expect(sendResolved).toHaveBeenCalledTimes(1)
    const [email, report] = sendResolved.mock.calls[0]
    expect(email).toBe('citoyen@example.com')
    expect(report.eventNumber).toBe(42)
    expect(report.category).toBe('fallen_tree')
    expect(report.resolvedAt).toBeInstanceOf(Date)
  })

  it('falls back to the account email when the report belongs to a user', async () => {
    returning.mockResolvedValueOnce(
      resolvedRow({ userId: 'a-user-id', reporterEmail: null }),
    )
    selectWhere.mockResolvedValueOnce([{ email: 'benevole@example.com' }])

    await resolveReport({}, formData())

    expect(sendResolved).toHaveBeenCalledTimes(1)
    expect(sendResolved.mock.calls[0][0]).toBe('benevole@example.com')
  })

  it('sends nothing when the report is already resolved', async () => {
    returning.mockResolvedValueOnce([])

    const result = await resolveReport({}, formData())

    expect(result.message).toBe('Signalement introuvable ou déjà résolu.')
    expect(sendResolved).not.toHaveBeenCalled()
  })

  it('sends nothing when the reporter deleted their account', async () => {
    returning.mockResolvedValueOnce(
      resolvedRow({ reporterEmail: ANONYMISED_REPORTER }),
    )

    const result = await resolveReport({}, formData())

    expect(result).toEqual({})
    expect(sendResolved).not.toHaveBeenCalled()
  })

  it('sends nothing when the account behind the report is gone', async () => {
    returning.mockResolvedValueOnce(
      resolvedRow({ userId: 'a-user-id', reporterEmail: null }),
    )
    selectWhere.mockResolvedValueOnce([])

    await resolveReport({}, formData())

    expect(sendResolved).not.toHaveBeenCalled()
  })

  it('keeps the report resolved when the email fails', async () => {
    returning.mockResolvedValueOnce(resolvedRow())
    sendResolved.mockRejectedValueOnce(new Error('boom'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await resolveReport({}, formData())

    expect(result).toEqual({})
    expect(revalidatePath).toHaveBeenCalledWith('/reports')
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
