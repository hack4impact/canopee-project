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
