import Image from 'next/image'

function formatDate(date: Date): string {
  const formatted = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

type TopPanelProps = {
  date?: string
}

export function TopPanel({ date = formatDate(new Date()) }: TopPanelProps) {
  return (
    <header className="fixed top-[calc(1rem+env(safe-area-inset-top))] left-1/2 z-50 flex w-[min(96%,1200px)] -translate-x-1/2 items-center justify-between rounded-2xl border border-white/10 bg-canopee-forest/75 px-5 py-4 text-canopee-cream shadow-md shadow-black/30 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <Image
          src="/canopee_icone.png"
          alt="Canopee logo"
          width={173}
          height={173}
          className="h-11 w-auto"
        />
        <div className="flex flex-col gap-1">
          <span className="text-sm text-[#f6f4df]">{date}</span>
          <h1 className="font-heading text-xl leading-none">
            Bon retour parmi nous
          </h1>
        </div>
      </div>
    </header>
  )
}
