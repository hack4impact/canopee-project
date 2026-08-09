import type { Metadata } from 'next'
import { Averia_Serif_Libre, Geist_Mono } from 'next/font/google'
import localFont from 'next/font/local'
import 'mapbox-gl/dist/mapbox-gl.css'
import './globals.css'

const averiaSerifLibre = Averia_Serif_Libre({
  // Titres et sous-titres (pas une police variable : poids explicites requis).
  weight: ['400', '700'],
  variable: '--font-averia',
  subsets: ['latin'],
})

const museoSans = localFont({
  // Texte courant. Fichiers dans ./fonts — voir src/app/fonts/README.md.
  // Museo Sans n'existe pas en graisse 400 : son « régulier » est le 500.
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
  icons: [
    { rel: 'icon', url: '/canopee_icone.ico?v=2' },
    { rel: 'shortcut icon', url: '/canopee_icone.ico?v=2' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="fr"
      className={`${averiaSerifLibre.variable} ${museoSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
