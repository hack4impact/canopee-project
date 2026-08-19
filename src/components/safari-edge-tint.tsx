export function SafariEdgeTint() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[env(safe-area-inset-top)] bg-canopee-cream"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 h-[env(safe-area-inset-bottom)] bg-canopee-cream"
      />
    </>
  )
}
