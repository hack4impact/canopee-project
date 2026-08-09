import { roleEnum, statusEnum } from '@/db/schema'

export type Role = (typeof roleEnum.enumValues)[number]

export type Status = (typeof statusEnum.enumValues)[number]

export const ROLES: readonly Role[] = roleEnum.enumValues

export const ROLE_ORDER: Record<Role, number> = {
  volunteer: 1,
  pro: 2,
  admin: 3,
}

const ACTIVE_STATUS: Status = 'approved'

type AuthUser = { role: Role; status: Status } | null | undefined

function rank(role: string): number {
  return (ROLE_ORDER as Record<string, number | undefined>)[role] ?? 0
}

export function isApproved(user: AuthUser): boolean {
  return !!user && user.status === ACTIVE_STATUS
}

export function isPending(user: AuthUser): boolean {
  return user?.status === 'pending'
}

export function isRejected(user: AuthUser): boolean {
  return user?.status === 'rejected'
}

export function canAccess(user: AuthUser, requiredRole: Role): boolean {
  if (!user || !isApproved(user)) return false
  return rank(user.role) >= rank(requiredRole)
}

export function isAdmin(user: AuthUser): boolean {
  return canAccess(user, 'admin')
}
