import { BaseMap } from '@/components/base-map'
import { LeavePatrolLink } from '@/components/leave-patrol-link'
import { PatrolControls } from '@/components/patrol-controls'

type CarteViewProps = {
  accessToken?: string
  patrolStartedAt?: string | null
}

export function CarteView({
  accessToken,
  patrolStartedAt = null,
}: CarteViewProps) {
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
          <BaseMap
            accessToken={accessToken}
            className="h-full w-full overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800"
          />

          <PatrolControls startedAt={patrolStartedAt} />
        </div>
      </main>
    </div>
  )
}
