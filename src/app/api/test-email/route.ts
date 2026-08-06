import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'test-email route is available',
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    return NextResponse.json({
      ok: true,
      received: body,
    })
  } catch {
    return NextResponse.json(
      {
        ok: true,
        received: {},
      },
      { status: 200 },
    )
  }
import { sendApprovalEmail, sendRejectionEmail } from '@/lib/plunk'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'approval'
  const email = searchParams.get('email') ?? 'laurie@polymtl.hack4impact.org'

  if (type === 'rejection') {
    await sendRejectionEmail(email)
    return Response.json({ message: `Rejection email sent to ${email}` })
  }

  await sendApprovalEmail(email)
  return Response.json({ message: `Approval email sent to ${email}` })
}
