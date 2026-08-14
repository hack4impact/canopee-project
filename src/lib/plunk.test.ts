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

import { sendApprovalEmail, sendRejectionEmail } from './plunk'

describe('plunk email helpers', () => {
  beforeEach(() => {
    sendMock.mockReset()
  })

  afterEach(() => {
    // Unpatches the console spies below, which outlive their tests otherwise.
    vi.restoreAllMocks()
  })

  it('logs and does not throw when approval email sending fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('boom'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(sendApprovalEmail('user@example.com')).resolves.toBeUndefined()
    expect(consoleError).toHaveBeenCalled()
  })

  it('logs and does not throw when rejection email sending fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('boom'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      sendRejectionEmail('user@example.com'),
    ).resolves.toBeUndefined()
    expect(consoleError).toHaveBeenCalled()
  })
})
