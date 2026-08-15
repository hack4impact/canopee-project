import { BaseMap } from '@/components/base-map'
import { requireApprovedUser } from '@/lib/auth/current-user'

export const dynamic = 'force-dynamic'

export default async function Home() {
  await requireApprovedUser()

  return (
    <BaseMap
      accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      className="h-dvh w-full"
    />
  )
}
