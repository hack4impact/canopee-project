import type { ReactNode } from 'react'
import { BottomNav } from '@/components/bottom-nav'
import { MapProvider } from '@/components/map-provider'
import { SafariScrollRunway } from '@/components/safari-scroll-runway'
import { requireApprovedUser } from '@/lib/auth/current-user'

export default async function MapLayout({ children }: { children: ReactNode }) {
  await requireApprovedUser()

  return (
    <>
      <MapProvider accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}>
        {children}
        <BottomNav />
      </MapProvider>
      <SafariScrollRunway />
    </>
  )
}
