import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}))

vi.mock('@plunk/node', () => ({
  default: class MockPlunk {
    emails = {
      send: sendMock,
    }
  },
}))

import {
  sendApprovalEmail,
  sendRejectionEmail,
  sendReportResolvedEmail,
} from '@/lib/plunk'

describe('plunk email helpers', () => {
  beforeEach(() => {
    sendMock.mockReset()
    process.env.PLUNK_API_KEY = 'test-key'
  })

  afterEach(() => {
    // Unpatches the console spies below, which outlive their tests otherwise.
    vi.restoreAllMocks()
  })

  it('logs and does not throw when approval email sending fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('boom'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(sendApprovalEmail('user@example.com')).resolves.toBe(false)
    expect(consoleError).toHaveBeenCalled()
  })

  it('logs and does not throw when rejection email sending fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('boom'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(sendRejectionEmail('user@example.com')).resolves.toBe(false)
    expect(consoleError).toHaveBeenCalled()
  })

  it('renders the report details in the resolved email', async () => {
    await sendReportResolvedEmail('reporter@example.com', {
      eventNumber: 42,
      category: 'fallen_tree',
      createdAt: new Date('2026-03-04T15:00:00Z'),
      resolvedAt: new Date('2026-03-09T15:00:00Z'),
    })

    const [payload] = sendMock.mock.calls[0]
    expect(payload.to).toBe('reporter@example.com')
    expect(payload.subject).toContain('# 0042')
    expect(payload.body).toContain('Arbre tombé')
    expect(payload.body).toContain('4 mars 2026')
    expect(payload.body).toContain('9 mars 2026')
    expect(payload.body).not.toContain('alt="Photo du signalement"')
  })

  it('includes the photo in the resolved email when the report has one', async () => {
    await sendReportResolvedEmail('reporter@example.com', {
      eventNumber: 7,
      category: 'littering',
      createdAt: new Date('2026-03-04T15:00:00Z'),
      resolvedAt: new Date('2026-03-09T15:00:00Z'),
      photoUrl: 'https://example.com/photo.jpg',
    })

    const [payload] = sendMock.mock.calls[0]
    expect(payload.body).toContain('src="https://example.com/photo.jpg"')
  })

  it('logs and does not throw when the resolved email fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('boom'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      sendReportResolvedEmail('reporter@example.com', {
        eventNumber: 42,
        category: 'fallen_tree',
        createdAt: new Date('2026-03-04T15:00:00Z'),
        resolvedAt: new Date('2026-03-09T15:00:00Z'),
      }),
    ).resolves.toBe(false)
    expect(consoleError).toHaveBeenCalled()
  })

  it('falls back to a text wordmark when no site url is configured', async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL

    await sendApprovalEmail('user@example.com')

    const [payload] = sendMock.mock.calls[0]
    expect(payload.body).toContain('CANOPÉE')
    expect(payload.body).not.toContain('<img')
  })

  it('links the logo absolutely when a site url is configured', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://canopee.example.ca/'

    await sendApprovalEmail('user@example.com')

    const [payload] = sendMock.mock.calls[0]
    expect(payload.body).toContain(
      'src="https://canopee.example.ca/canopee_blanc.png"',
    )
    delete process.env.NEXT_PUBLIC_SITE_URL
  })
})
