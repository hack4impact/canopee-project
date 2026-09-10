const CARD = 'rounded-2xl border border-canopee-forest/10 bg-white/70 shadow-sm'

const PULSE = 'animate-pulse motion-reduce:animate-none'

export function PageSkeleton({ width, rows }: { width: string; rows: number }) {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-canopee-cream">
      <main
        className={`mx-auto flex w-full ${width} flex-1 flex-col gap-4 px-4 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-32 sm:px-6`}
      >
        <div className="flex items-center justify-between gap-4">
          <div
            className={`h-8 w-44 rounded-lg bg-canopee-forest/10 ${PULSE}`}
          />
          <div
            className={`h-9 w-24 rounded-lg bg-canopee-forest/10 ${PULSE}`}
          />
        </div>

        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className={`h-24 ${CARD} ${PULSE}`} />
        ))}
      </main>
    </div>
  )
}
