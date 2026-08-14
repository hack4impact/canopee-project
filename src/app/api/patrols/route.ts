import type { NextRequest } from 'next/server'
import { getCurrentUserProfile } from '@/lib/auth/current-user'
import { canAccess } from '@/lib/auth/roles'
import { listPatrolsForUser, parsePageParam } from '@/lib/patrols/queries'

const SELF = 'me'

export async function GET(request: NextRequest) {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    return Response.json({ error: 'Not signed in.' }, { status: 401 })
  }

  if (!canAccess(profile, 'volunteer')) {
    return Response.json({ error: 'Account not approved.' }, { status: 403 })
  }

  const requestedUser = request.nextUrl.searchParams.get('user_id')

  if (requestedUser !== null && requestedUser !== SELF) {
    return Response.json(
      { error: 'You can only list your own patrols.' },
      { status: 403 },
    )
  }

  const page = parsePageParam(request.nextUrl.searchParams.get('page'))
  const { items, hasNextPage } = await listPatrolsForUser(profile.id, page)

  return Response.json({ page, hasNextPage, patrols: items })
}
