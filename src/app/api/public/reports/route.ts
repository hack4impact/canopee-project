import type { NextRequest } from 'next/server'
import {
  citizenWindowStart,
  isRateLimited,
  normalizeReporterEmail,
  validateReporterConsent,
  validateReporterEmail,
} from '@/lib/reports/citizen'
import { countRecentCitizenReports } from '@/lib/reports/queries'
import { createCitizenReport } from '@/lib/reports/submit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const DEBUG = '[photo-debug]'

  console.error(DEBUG, 'incoming', {
    contentLength: request.headers?.get('content-length'),
    contentType: request.headers?.get('content-type')?.slice(0, 60),
    userAgent: request.headers?.get('user-agent')?.slice(0, 160),
  })

  let formData: FormData

  try {
    formData = await request.formData()
  } catch (cause) {
    console.error(DEBUG, 'formData parse failed', {
      message: cause instanceof Error ? cause.message : String(cause),
    })
    return Response.json({ error: 'Expected a form body.' }, { status: 400 })
  }

  const rawPhoto = formData.get('photo')

  console.error(DEBUG, 'photo field', {
    isFile: rawPhoto instanceof File,
    type: rawPhoto instanceof File ? rawPhoto.type : typeof rawPhoto,
    size: rawPhoto instanceof File ? rawPhoto.size : null,
    name: rawPhoto instanceof File ? rawPhoto.name : null,
  })

  const submitted = String(formData.get('reporterEmail') ?? '')
  const emailError = validateReporterEmail(submitted)
  const consentError = validateReporterConsent(
    formData.get('reporterConsent') === 'true',
  )

  if (emailError || consentError) {
    return Response.json(
      {
        errors: {
          ...(emailError ? { reporterEmail: emailError } : {}),
          ...(consentError ? { reporterConsent: consentError } : {}),
        },
      },
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

  console.error(DEBUG, 'result', {
    submitted: Boolean(result.submittedId),
    conflict: Boolean(result.conflict),
    message: result.message ?? null,
    errors: result.errors ? Object.keys(result.errors) : null,
  })

  if (result.conflict) {
    return Response.json(result, { status: 409 })
  }

  if (result.errors || result.message) {
    return Response.json(result, { status: 422 })
  }

  return Response.json(result)
}
