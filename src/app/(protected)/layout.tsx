import { requireApprovedUser } from '@/lib/auth/current-user'

/**
 * Everything under this route group requires an approved account. The gate
 * lives in the layout rather than in each page so a new route is protected by
 * where it sits in the tree, not by remembering to add a check to it.
 *
 * The group name is in parentheses, so it doesn't appear in any URL: the page
 * beside this file is still served at `/`.
 *
 * Public routes — the login and signup forms, the approval-pending screen, and
 * eventually citizen report submission, which the PRD scopes to people with no
 * account at all — live outside this group.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireApprovedUser()

  return children
}
