import { BaseMap } from '@/components/base-map'
import { BottomNav } from '@/components/bottom-nav'
import { TopPanel } from '@/components/top-panel'
import { requireApprovedUser } from '@/lib/auth/current-user'

export const dynamic = 'force-dynamic'

export default async function Home() {
  await requireApprovedUser()

  return (
    <div className="flex h-dvh w-full flex-col">
      <TopPanel />
      <BaseMap
        accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        className="h-dvh w-full"
      />
      <BottomNav />
    </div>
  )
}
