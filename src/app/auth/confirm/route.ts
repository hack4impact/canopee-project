import { redirect } from 'next/navigation'
import type { EmailOtpType } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TYPES: EmailOtpType[] = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
]

function parseType(value: string | null): EmailOtpType | null {
  return TYPES.includes(value as EmailOtpType) ? (value as EmailOtpType) : null
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = parseType(request.nextUrl.searchParams.get('type'))
  const code = request.nextUrl.searchParams.get('code')
  const next = request.nextUrl.searchParams.get('next')
  const target = next?.startsWith('/') ? next : '/'

  const supabase = await createClient()

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    })

    if (error) {
      redirect('/login?erreur=lien-expire')
    }

    redirect(target)
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      redirect('/login?erreur=lien-expire')
    }

    redirect(target)
  }

  redirect('/login?erreur=lien-invalide')
}
