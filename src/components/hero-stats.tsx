const SHELL =
  'absolute inset-x-2.5 bottom-2.5 flex gap-1.5 rounded-[20px] bg-canopee-forest/90 p-1.5 shadow-lg shadow-black/25 ring-1 ring-white/20 backdrop-blur-md'

const PILL =
  'flex flex-1 flex-col items-center gap-0.5 rounded-xl bg-black/20 px-1 py-1.5 text-canopee-cream ring-1 ring-white/10 ring-inset'

const VALUE =
  'font-heading text-[17px] leading-none font-bold whitespace-nowrap tabular-nums'

const LABEL =
  'text-[8.5px] font-bold tracking-[0.09em] text-canopee-cream/70 uppercase'

const TONES = {
  neutral: '',
  alert: 'text-[#ffb3aa]',
  ok: 'text-[#9fe3b8]',
}

export type HeroStat = {
  label: string
  value: string
  tone?: keyof typeof TONES
}

export function HeroStats({ stats }: { stats: readonly HeroStat[] }) {
  return (
    <div className={SHELL}>
      {stats.map((stat) => (
        <span key={stat.label} className={PILL}>
          <b className={`${VALUE} ${TONES[stat.tone ?? 'neutral']}`}>
            {stat.value}
          </b>
          <span className={LABEL}>{stat.label}</span>
        </span>
      ))}
    </div>
  )
}
