export type PatrolPictoName = 'trail' | 'hiker' | 'leaf' | 'sprout'

type FilledPicto = {
  viewBox: string
  paths: readonly string[]
}

const TRAIL: FilledPicto = {
  viewBox: '0 0 512 512',
  paths: [
    'M149.9 27.2L34.25 56.74v76.76L157.8 93.85l46.7-44.67-54.6-21.98zm132.8 57c-7.4.18-10.1 1.88.9 7.13C346.9 121.6 441.7 206.8 391.3 216.9 232.2 249 130.4 292.3 48.51 390.8 25.42 418.6 18 494.8 18 494.8h432.6s-139-21.1-147.8-75.7c-14.9-92.2 194.5-102.7 196.5-199.9.9-43.2-88.3-124.99-184.4-132.52-5.6-.44-22.7-2.71-32.2-2.48zm-163.5 40.9l-32.69 10.5v122.2l35.99-10-3.3-122.7z',
  ],
}

const HIKER: FilledPicto = {
  viewBox: '0 0 52 52',
  paths: [
    'M27.8,2c3.3,0,5.9,2.6,5.9,5.9s-2.7,5.9-5.9,5.9s-5.9-2.6-5.9-5.9S24.5,2,27.8,2z',
    'M43,18.1c-1.2-0.1-2.3,0.7-2.4,1.8L40,25.7c-0.2,0-0.3,0.3-0.5,0.3h-5.5l-3.8-6.7c-0.3-0.6-0.9-1.1-1.6-1.2 l-5.8-0.8c-1-0.1-2,0.4-2.4,1.4l-4.4,11.3c-0.3,0.9,0.1,1.8,0.9,2.3l10.8,7.4l0.9,8.4c0.1,1.1,1.1,1.9,2.2,1.9l0,0 c1.3,0,2.3-1,2.2-2.2L32,37.5c0-0.5-0.3-1-0.8-1.4l-5.9-6.6l2.2-5.4l2.6,4.5c0.4,0.6,1.1,1.3,1.9,1.3h7.6l-2.2,18 c-0.1,1.1,0.7,2,1.9,2.1c0.1,0,0.2-0.1,0.2-0.1c1.1,0,2-0.8,2.2-1.9L45,20.2C45.1,19.2,44.2,18.2,43,18.1z',
    'M12.2,27.7l3.7-9.5c0.2-0.6,0.5-1.2,0.9-1.8l-0.5-0.1c-3.2-0.4-6.2,1.5-7.2,4.4l-2,5.2 c-0.4,1.1,0.2,2.4,1.4,2.7l0.9,0.2C10.6,29.3,11.8,28.7,12.2,27.7z',
    'M13.6,35.2L9.1,48.6c-0.2,0.7,0.3,1.3,1,1.3h2.5c0.9,0,1.8-0.6,2.1-1.4l4.4-9.7l-5-3.1 C14,35.5,13.8,35.3,13.6,35.2z',
  ],
}

export function PatrolPicto({
  name,
  className,
}: {
  name: PatrolPictoName
  className?: string
}) {
  if (name === 'leaf') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <path d="M20 3.8C20 11.9 14.4 18 6.3 18 6.3 9.9 11.9 3.8 20 3.8Z" />
        <path d="M6.3 18 20 3.8" />
        <path d="M3.6 20.7 6.3 18" />
      </svg>
    )
  }

  if (name === 'sprout') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <path d="M12 21v-9.4" />
        <path d="M12 13.4c0-4 2.9-6.9 7-6.9 0 4-2.9 6.9-7 6.9Z" />
        <path d="M12 17c0-3-2.2-5.2-5.3-5.2 0 3 2.2 5.2 5.3 5.2Z" />
      </svg>
    )
  }

  const picto = name === 'hiker' ? HIKER : TRAIL

  return (
    <svg
      viewBox={picto.viewBox}
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      {picto.paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
