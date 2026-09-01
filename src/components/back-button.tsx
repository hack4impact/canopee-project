'use client'

import { ArrowLeftIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function BackButton({ fallback }: { fallback: string }) {
  const router = useRouter()

  function goBack() {
    if (window.history.length > 1) {
      router.back()
      return
    }

    router.push(fallback)
  }

  return (
    <Button
      type="button"
      variant="forest"
      size="icon"
      aria-label="Revenir à la page précédente"
      onClick={goBack}
    >
      <ArrowLeftIcon />
    </Button>
  )
}
