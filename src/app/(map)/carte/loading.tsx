const PULSE = 'animate-pulse motion-reduce:animate-none'

export default function CarteLoading() {
  return (
    <div className="fixed inset-0 flex flex-col bg-[#dde5d1]">
      <div
        className={`absolute top-[calc(1rem+env(safe-area-inset-top))] left-4 size-12 rounded-2xl bg-canopee-forest/25 ${PULSE}`}
      />
      <div
        className={`absolute top-[calc(4.75rem+env(safe-area-inset-top))] left-4 size-12 rounded-2xl bg-canopee-forest/25 ${PULSE}`}
      />
      <div
        className={`absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 size-14 rounded-2xl bg-canopee-cream/70 ${PULSE}`}
      />

      <div
        className={`absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 h-16 w-56 -translate-x-1/2 rounded-2xl bg-canopee-forest/80 ${PULSE}`}
      />

      <span className="sr-only" role="status">
        Chargement de la carte
      </span>
    </div>
  )
}
