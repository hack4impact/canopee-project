import { isAdmin, type Role, type Status } from '@/lib/auth/roles'

type Viewer = { id: string; role: Role; status: Status }

export function canViewPatrol(
  viewer: Viewer,
  patrol: { userId: string },
): boolean {
  return patrol.userId === viewer.id || isAdmin(viewer)
}
