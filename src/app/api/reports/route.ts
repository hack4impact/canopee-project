import type { NextRequest } from 'next/server'
import { getCurrentUserProfile } from '@/lib/auth/current-user'
import { canAccess } from '@/lib/auth/roles'
import { listReportPins } from '@/lib/reports/queries'
import { createReport } from '@/lib/reports/submit'
import {
  parseCategoriesParam,
  parseStatusParam,
  REPORT_STATUSES,
} from '@/lib/reports/pins'

export async function GET(request: NextRequest) {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    return Response.json({ error: 'Not signed in.' }, { status: 401 })
  }

  if (!canAccess(profile, 'volunteer')) {
    return Response.json({ error: 'Account not approved.' }, { status: 403 })
  }

  const parsed = parseStatusParam(request.nextUrl.searchParams.get('status'))

  if (!parsed.ok) {
    return Response.json(
      {
        error: `Unknown status "${parsed.value}". Expected one of: ${REPORT_STATUSES.join(', ')}.`,
      },
      { status: 400 },
    )
  }

  const selected = parseCategoriesParam(
    request.nextUrl.searchParams.get('categories'),
  )

  if (!selected.ok) {
    return Response.json(
      { error: `Unknown category "${selected.value}".` },
      { status: 400 },
    )
  }

  const reports = await listReportPins(parsed.status, selected.categories)

  return Response.json({
    status: parsed.status,
    categories: selected.categories,
    reports,
  })
}

export async function POST(request: NextRequest) {
  const profile = await getCurrentUserProfile()

  if (!profile || !canAccess(profile, 'volunteer')) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let formData: FormData

  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'Expected a form body.' }, { status: 400 })
  }

  const result = await createReport(profile, formData)

  if (result.conflict) {
    return Response.json(result, { status: 409 })
  }

  if (result.errors || result.message) {
    return Response.json(result, { status: 422 })
  }

  return Response.json(result)
}
