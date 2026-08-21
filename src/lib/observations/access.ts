import { canAccess, type Role, type Status } from '@/lib/auth/roles'

export const OBSERVATIONS_MIN_ROLE: Role = 'pro'

export type ObservationViewer =
  { role: Role; status: Status } | null | undefined

export function canViewObservations(viewer: ObservationViewer): boolean {
  return canAccess(viewer, OBSERVATIONS_MIN_ROLE)
}
