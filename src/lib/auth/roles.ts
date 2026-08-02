import { roleEnum, statusEnum } from '@/db/schema'

/**
 * A stored user role. Derived from the Drizzle `role` enum so the database
 * schema stays the single source of truth for which roles exist.
 */
export type Role = (typeof roleEnum.enumValues)[number]

/**
 * A stored approval status, derived from the Drizzle `status` enum for the
 * same reason as `Role`.
 */
export type Status = (typeof statusEnum.enumValues)[number]

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

/** The only status that grants access to anything. */
const ACTIVE_STATUS: Status = 'approved'

type AuthUser = { role: Role; status: Status } | null | undefined

/**
 * Rank of a role, or 0 for anything outside the hierarchy. Guards against a
 * role value that has drifted from the enum at runtime (e.g. stale DB data).
 */
function rank(role: string): number {
  return (ROLE_ORDER as Record<string, number | undefined>)[role] ?? 0
}

/**
 * True when the account is active. Anything other than `approved` — a volunteer
 * still awaiting review, or one an admin turned down — is inactive and reaches
 * nothing. Callers should go through `canAccess` rather than comparing
 * `status` themselves, so the rule lives in one place.
 */
export function isApproved(user: AuthUser): boolean {
  return !!user && user.status === ACTIVE_STATUS
}

/** True when the account exists but is still waiting on an admin decision. */
export function isPending(user: AuthUser): boolean {
  return user?.status === 'pending'
}

/** True when an admin turned the account down. */
export function isRejected(user: AuthUser): boolean {
  return user?.status === 'rejected'
}

/**
 * True when `user` is approved *and* holds `requiredRole` or higher. Both
 * halves matter: a pending volunteer outranks nobody, because an account that
 * has not been approved cannot be used at all.
 *
 * A nullish user (unauthenticated — e.g. a citizen with no account) or an
 * unrecognized role is treated as the lowest privilege and denied.
 */
export function canAccess(user: AuthUser, requiredRole: Role): boolean {
  if (!user || !isApproved(user)) return false
  return rank(user.role) >= rank(requiredRole)
}

/** Convenience check for the top of the hierarchy. */
export function isAdmin(user: AuthUser): boolean {
  return canAccess(user, 'admin')
}
