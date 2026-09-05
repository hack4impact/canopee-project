import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is not configured`)
  }
  return value
}

function getSupabaseConfig() {
  return {
    url: required(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      'NEXT_PUBLIC_SUPABASE_URL',
    ),
    key: required(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    ),
  }
}

export async function createClient() {
  const { url, key } = getSupabaseConfig()

  try {
    const cookieStore = await cookies()

    return createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {}
        },
      },
    })
  } catch {
    return createServerClient(url, key, {
      cookies: {
        getAll() {
          return []
        },
        setAll() {},
      },
    })
  }
}
