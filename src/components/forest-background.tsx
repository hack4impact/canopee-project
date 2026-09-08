import Image from 'next/image'

export function ForestBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <Image
        src="/images/forest-canopee.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-canopee-forest/40" />
    </div>
  )
}
