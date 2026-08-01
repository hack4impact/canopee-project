import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is not set`)
  }

  return value
}

/**
 * Supabase client for server-side code. Reads and writes the session cookies
 * through Next's cookie store, so build a new one per request rather than
 * sharing a single instance.
 *
 * The environment is checked here rather than at module scope. Importing this
 * file must not throw: `next build` evaluates the module graph of every route
 * while collecting page data, so a module-scope throw fails the whole build
 * with a stack trace pointing at the bundler instead of at the missing
 * variable. Failing on first use keeps the error where it can be read.
 */
export async function createClient() {
  // Read through the full `process.env.NEXT_PUBLIC_*` expression: Next swaps
  // those in at build time by matching the literal text, so a lookup by
  // variable name would never be replaced.
  const supabaseUrl = required(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_URL',
  )

  const supabaseKey = required(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  )

  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components aren't allowed to write cookies. They only read
          // the session, so there's nothing to salvage here.
        }
      },
    },
  })
}
