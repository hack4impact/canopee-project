import type { NextRequest } from 'next/server'
import {
  citizenWindowStart,
  isRateLimited,
  normalizeReporterEmail,
  validateReporterEmail,
} from '@/lib/reports/citizen'
import { countRecentCitizenReports } from '@/lib/reports/queries'
import { createCitizenReport } from '@/lib/reports/submit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let formData: FormData

  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'Expected a form body.' }, { status: 400 })
  }

  const submitted = String(formData.get('reporterEmail') ?? '')
  const emailError = validateReporterEmail(submitted)

  if (emailError) {
    return Response.json(
      { errors: { reporterEmail: emailError } },
      { status: 422 },
    )
  }

  const email = normalizeReporterEmail(submitted)

  const recent = await countRecentCitizenReports(
    email,
    citizenWindowStart(new Date()),
  )

  if (isRateLimited(recent)) {
    return Response.json(
      {
        message:
          'Vous avez envoyé plusieurs signalements récemment. Réessayez dans une heure.',
      },
      { status: 429 },
    )
  }

  const result = await createCitizenReport(email, formData)

  if (result.errors || result.message) {
    return Response.json(result, { status: 422 })
  }

  return Response.json(result)
}
