'use client'

import { BaseMap } from '@/components/base-map'
import { BottomNav } from '@/components/bottom-nav'
import { PatrolControls } from '@/components/patrol-controls'

type PatrouilleViewProps = {
  accessToken?: string
  patrolStartedAt?: string | null
}

export function PatrouilleView({
  accessToken,
  patrolStartedAt = null,
}: PatrouilleViewProps) {
  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden">
      <BaseMap accessToken={accessToken} className="h-dvh w-full" />

      <div className="absolute bottom-28 left-1/2 z-10 -translate-x-1/2">
        <PatrolControls startedAt={patrolStartedAt} />
      </div>

      <BottomNav />
    </div>
  )
}
