'use client'
import { useState } from 'react'
import { HeatmapMap } from '@/components/heatmap-map'
import { LeavePatrolLink } from '@/components/leave-patrol-link'
import { PatrolControls } from '@/components/patrol-controls'

type CarteViewProps = {
  accessToken?: string
  patrolStartedAt?: string | null
  canViewHeatmap: boolean
}

export function CarteView({
  accessToken,
  patrolStartedAt = null,
  canViewHeatmap,
}: CarteViewProps) {
  const [showHeatmap, setShowHeatmap] = useState(true)
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <header className="mx-auto flex w-full max-w-6xl flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl dark:text-zinc-50">
              Carte de Laval
            </h1>
            <LeavePatrolLink
              href="/"
              isPatrolActive={patrolStartedAt !== null}
              className="shrink-0 text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
            >
              Accueil
            </LeavePatrolLink>
          </div>
          <p className="text-sm text-zinc-600 sm:text-base dark:text-zinc-400">
            Zoomez, déplacez la carte et utilisez « Me localiser » pour centrer
            la vue sur votre position.
          </p>
        </header>

        <div className="relative mx-auto h-[min(70vh,720px)] min-h-[280px] w-full max-w-6xl">
          <HeatmapMap
            accessToken={accessToken}
            visible={canViewHeatmap && showHeatmap}
            className="h-full w-full overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800"
          />
          <div className="absolute top-4 left-4 z-10">
            <PatrolControls startedAt={patrolStartedAt} />
          </div>
          {canViewHeatmap && (
            <button
              type="button"
              onClick={() => setShowHeatmap((current) => !current)}
              className="absolute top-4 right-4 z-10 rounded border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {showHeatmap
                ? 'Masquer la carte de chaleur'
                : 'Afficher la carte de chaleur'}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
