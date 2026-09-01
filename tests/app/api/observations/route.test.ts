import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Observation } from '@/lib/observations/collection'

const { getCurrentUserProfile, listObservations } = vi.hoisted(() => ({
  getCurrentUserProfile: vi.fn(),
  listObservations: vi.fn(),
}))

vi.mock('@/lib/auth/current-user', () => ({ getCurrentUserProfile }))
vi.mock('@/lib/observations/queries', () => ({ listObservations }))

const { GET } = await import('@/app/api/observations/route')

const OBSERVATION: Observation = {
  id: '3f7c1a92-5d64-4f0b-9a21-8c5e7b04d113',
  category: 'reptile',
  latitude: 45.5865,
  longitude: -73.7243,
}

const DENIED = [
  { label: 'a citizen with no account', profile: null },
  {
    label: 'an approved volunteer',
    profile: { role: 'volunteer', status: 'approved' },
  },
  {
    label: 'a volunteer still awaiting approval',
    profile: { role: 'volunteer', status: 'pending' },
  },
  {
    label: 'a pro still awaiting approval',
    profile: { role: 'pro', status: 'pending' },
  },
  { label: 'a rejected pro', profile: { role: 'pro', status: 'rejected' } },
  { label: 'a rejected admin', profile: { role: 'admin', status: 'rejected' } },
]

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/observations', () => {
  describe.each(DENIED)('$label', ({ profile }) => {
    it('is refused with 403 and never reaches the query', async () => {
      getCurrentUserProfile.mockResolvedValue(profile)
      listObservations.mockResolvedValue([OBSERVATION])

      const response = await GET()

      expect(response.status).toBe(403)
      expect(listObservations).not.toHaveBeenCalled()
    })

    it('carries no fauna or flora data in the refusal', async () => {
      getCurrentUserProfile.mockResolvedValue(profile)
      listObservations.mockResolvedValue([OBSERVATION])

      const body = await (await GET()).text()

      expect(body).not.toContain(OBSERVATION.id)
      expect(body).not.toContain(OBSERVATION.category)
      expect(body).not.toContain(String(OBSERVATION.latitude))
      expect(body).not.toContain(String(OBSERVATION.longitude))
      expect(body).not.toContain('FeatureCollection')
    })
  })

  it('refuses a citizen and a volunteer in the same terms', async () => {
    getCurrentUserProfile.mockResolvedValue(null)
    const citizen = await GET()

    getCurrentUserProfile.mockResolvedValue({
      role: 'volunteer',
      status: 'approved',
    })
    const volunteer = await GET()

    expect(citizen.status).toBe(volunteer.status)
    expect(await citizen.json()).toEqual(await volunteer.json())
  })

  it('serves the layer to an approved pro', async () => {
    getCurrentUserProfile.mockResolvedValue({ role: 'pro', status: 'approved' })
    listObservations.mockResolvedValue([OBSERVATION])

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      observations: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [OBSERVATION.longitude, OBSERVATION.latitude],
            },
            properties: {
              id: OBSERVATION.id,
              category: OBSERVATION.category,
            },
          },
        ],
      },
    })
  })

  it('serves the layer to an approved admin', async () => {
    getCurrentUserProfile.mockResolvedValue({
      role: 'admin',
      status: 'approved',
    })
    listObservations.mockResolvedValue([OBSERVATION])

    const response = await GET()
    const payload = (await response.json()) as {
      observations: { features: unknown[] }
    }

    expect(response.status).toBe(200)
    expect(payload.observations.features).toHaveLength(1)
  })

  it('serves an empty collection rather than failing when there is nothing to show', async () => {
    getCurrentUserProfile.mockResolvedValue({ role: 'pro', status: 'approved' })
    listObservations.mockResolvedValue([])

    const response = await GET()
    const payload = (await response.json()) as {
      observations: { type: string; features: unknown[] }
    }

    expect(response.status).toBe(200)
    expect(payload.observations.type).toBe('FeatureCollection')
    expect(payload.observations.features).toEqual([])
  })

  it('passes the profile to the query so the second gate can refuse too', async () => {
    const profile = { role: 'pro', status: 'approved' }

    getCurrentUserProfile.mockResolvedValue(profile)
    listObservations.mockResolvedValue([])

    await GET()

    expect(listObservations).toHaveBeenCalledWith(profile)
  })
})
