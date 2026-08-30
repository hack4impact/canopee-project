import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ObservationExportRow } from '@/lib/observations/export'

const { getCurrentUserProfile, listObservationsForExport } = vi.hoisted(() => ({
  getCurrentUserProfile: vi.fn(),
  listObservationsForExport: vi.fn(),
}))

vi.mock('@/lib/auth/current-user', () => ({ getCurrentUserProfile }))
vi.mock('@/lib/observations/queries', () => ({ listObservationsForExport }))

const { GET } = await import('./route')

function requestFor(url = 'http://localhost/api/fauna-flora/export') {
  return { nextUrl: new URL(url) } as Parameters<typeof GET>[0]
}

const OBSERVATION: ObservationExportRow = {
  eventNumber: 9,
  category: 'reptile',
  species: 'couleuvre à ventre rouge',
  latitude: '45.586500',
  longitude: '-73.724300',
  description: 'Sur le sentier principal',
  habitat: null,
  quantity: 1,
  unit: 'individus',
  statut: 'susceptible',
  photoUrl: 'a1b2/1755000000000-uuid.jpg',
  createdAt: new Date('2026-08-05T01:32:47.954Z'),
  observerFirstName: 'Laurie',
  observerLastName: 'Chammah',
  observerRole: 'admin',
  reporterEmail: null,
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/fauna-flora/export', () => {
  it('turns away a visitor who is not signed in', async () => {
    getCurrentUserProfile.mockResolvedValue(null)

    const response = await GET(requestFor())

    expect(response.status).toBe(401)
    expect(listObservationsForExport).not.toHaveBeenCalled()
  })

  it('turns away a volunteer', async () => {
    getCurrentUserProfile.mockResolvedValue({
      role: 'volunteer',
      status: 'approved',
    })

    const response = await GET(requestFor())

    expect(response.status).toBe(403)
    expect(listObservationsForExport).not.toHaveBeenCalled()
  })

  it('turns away a pro whose account is still pending', async () => {
    getCurrentUserProfile.mockResolvedValue({ role: 'pro', status: 'pending' })

    const response = await GET(requestFor())

    expect(response.status).toBe(403)
    expect(listObservationsForExport).not.toHaveBeenCalled()
  })

  it('serves the CSV to an approved pro', async () => {
    getCurrentUserProfile.mockResolvedValue({ role: 'pro', status: 'approved' })
    listObservationsForExport.mockResolvedValue([OBSERVATION])

    const response = await GET(requestFor())
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8')
    expect(response.headers.get('Content-Disposition')).toMatch(
      /^attachment; filename="signalements-faune-flore-\d{8}\.csv"$/,
    )
    expect(response.headers.get('Cache-Control')).toBe('no-store')

    const lines = body.replace('﻿', '').split('\r\n')

    expect(lines[0].startsWith('Catégorie,Nom scientifique')).toBe(true)
    expect(lines[1]).toContain('"Chammah, Laurie"')
    expect(lines[1].endsWith(',9')).toBe(true)
  })

  it('switches to semicolons when ?sep=semicolon is asked for', async () => {
    getCurrentUserProfile.mockResolvedValue({ role: 'pro', status: 'approved' })
    listObservationsForExport.mockResolvedValue([OBSERVATION])

    const response = await GET(
      requestFor('http://localhost/api/fauna-flora/export?sep=semicolon'),
    )
    const lines = (await response.text()).replace('﻿', '').split('\r\n')

    expect(lines[0].startsWith('Catégorie;Nom scientifique')).toBe(true)
    expect(lines[1]).toContain('Chammah, Laurie')
    expect(lines[1].endsWith(';9')).toBe(true)
  })

  it('still serves the header when there is nothing to export', async () => {
    getCurrentUserProfile.mockResolvedValue({
      role: 'admin',
      status: 'approved',
    })
    listObservationsForExport.mockResolvedValue([])

    const response = await GET(requestFor())

    expect(response.status).toBe(200)
    expect((await response.text()).replace('﻿', '').split('\r\n')).toHaveLength(
      2,
    )
  })
})
