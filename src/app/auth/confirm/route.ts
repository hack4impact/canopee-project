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
  const next = request.nextUrl.searchParams.get('next')

  if (!tokenHash || !type) {
    redirect('/login?erreur=lien-invalide')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  })

  if (error) {
    redirect('/login?erreur=lien-expire')
  }

  redirect(next?.startsWith('/') ? next : '/')
}
