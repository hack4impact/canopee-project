import { roleEnum } from '@/db/schema'

/**
 * A stored user role. Derived from the Drizzle `role` enum so the database
 * schema stays the single source of truth for which roles exist.
 */
export type Role = (typeof roleEnum.enumValues)[number]

/** Every stored role, in enum order (lowest- to highest-privilege). */
export const ROLES: readonly Role[] = roleEnum.enumValues

/**
 * Privilege ranking: a higher number wins, and a user can reach anything at or
 * below their own level. Typed as `Record<Role, number>` so adding a role to
 * the enum without ranking it here fails to compile.
 */
export const ROLE_ORDER: Record<Role, number> = {
  volunteer: 1,
  pro: 2,
  admin: 3,
}

type UserWithRole = { role: Role } | null | undefined

/**
 * Rank of a role, or 0 for anything outside the hierarchy. Guards against a
 * role value that has drifted from the enum at runtime (e.g. stale DB data).
 */
function rank(role: string): number {
  return (ROLE_ORDER as Record<string, number | undefined>)[role] ?? 0
}

/**
 * True when `user` holds `requiredRole` or higher. A nullish user
 * (unauthenticated — e.g. a citizen with no account) or an unrecognized role is
 * treated as the lowest privilege and denied.
 */
export function canAccess(user: UserWithRole, requiredRole: Role): boolean {
  if (!user) return false
  return rank(user.role) >= rank(requiredRole)
}

/** Convenience check for the top of the hierarchy. */
export function isAdmin(user: UserWithRole): boolean {
  return canAccess(user, 'admin')
}
