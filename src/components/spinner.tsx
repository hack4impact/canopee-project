/**
 * Indicateur de chargement. L'animation ne touche que `transform`, donc elle
 * reste sur le thread de composition et ne provoque ni reflow ni repaint.
 */
export function Spinner() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4 animate-spin motion-reduce:animate-none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}
