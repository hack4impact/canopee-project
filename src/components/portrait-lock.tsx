export function PortraitLock() {
  return (
    <div
      role="alertdialog"
      aria-label="Orientation non prise en charge"
      className="portrait-lock fixed inset-0 z-[200] hidden flex-col items-center justify-center gap-4 bg-canopee-forest px-8 text-center"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-12 w-12 text-canopee-lime"
        aria-hidden="true"
      >
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M12 18h.01" />
        <path d="M2.5 9.5a9.5 9.5 0 0 1 3-4.5" />
        <path d="m2 5 .5 4.5L7 9" />
      </svg>

      <p className="font-heading text-xl text-canopee-cream">
        Tournez votre appareil
      </p>

      <p className="max-w-xs text-sm text-canopee-cream/75">
        Canopée s’utilise en mode portrait.
      </p>
    </div>
  )
}
