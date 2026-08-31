import { beforeEach, describe, expect, it, vi } from 'vitest'

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
