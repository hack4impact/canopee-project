import type { Metadata, Viewport } from 'next'
import { Averia_Serif_Libre, Geist_Mono } from 'next/font/google'
import localFont from 'next/font/local'
import { PatrolControls } from '@/components/patrol-controls'
import { PatrolProvider } from '@/components/patrol-provider'
import { PatrolSync } from '@/components/patrol-sync'
import { ReportSync } from '@/components/report-sync'
import { DeepLink } from '@/components/deep-link'
import { getCurrentUserProfile } from '@/lib/auth/current-user'
import { getActivePatrol } from '@/lib/patrols/queries'
import 'mapbox-gl/dist/mapbox-gl.css'
import './globals.css'

const averiaSerifLibre = Averia_Serif_Libre({
  weight: ['400', '700'],
  variable: '--font-averia',
  subsets: ['latin'],
})

const museoSans = localFont({
  src: [
    {
      path: './fonts/MuseoSans-100.otf',
      weight: '100',
      style: 'normal',
    },
    {
      path: './fonts/MuseoSans-300.otf',
      weight: '300',
      style: 'normal',
    },
    {
      path: './fonts/MuseoSans_500.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: './fonts/MuseoSans_700.otf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-museo',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Canopée',
  description: 'Canopée — Next.js + Drizzle + Supabase',
  icons: {
    icon: [{ url: '/canopee_icone.png?v=3', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  viewportFit: 'cover',
}

/**
 * The patrol controls are rendered on every page, so their initial state comes
 * from here instead of a client fetch: the button is in the first paint with
 * no delay, and the client keeps it in step with the session afterwards.
 */
async function resolveInitialPatrolStartedAt(): Promise<string | null> {
  try {
    const profile = await getCurrentUserProfile()

    if (!profile) {
      return null
    }

    const activePatrol = await getActivePatrol(profile.id)

    return activePatrol?.startedAt.toISOString() ?? null
  } catch (error) {
    console.warn(
      'Unable to resolve the active patrol in the root layout',
      error,
    )
    return null
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const initialStartedAt = await resolveInitialPatrolStartedAt()

  return (
    <html
      lang="fr"
      className={`${averiaSerifLibre.variable} ${museoSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <PatrolProvider initialStartedAt={initialStartedAt}>
          {children}
          <PatrolControls />
        </PatrolProvider>
        <PatrolSync />
        <ReportSync />
        <DeepLink />
      </body>
    </html>
  )
}
