'use client'

import type { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { PrivacyPolicyContent } from '@/components/privacy-policy-content'

export function PrivacyPolicyLink({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={className}>
          {children}
        </button>
      </DialogTrigger>

      <DialogContent
        overlayClassName="z-[100] bg-canopee-forest/40 backdrop-blur-sm"
        className="z-[100] flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl"
      >
        <DialogHeader className="shrink-0 border-b border-canopee-forest/10 px-5 py-4">
          <DialogTitle className="pr-8 font-heading text-xl text-canopee-forest">
            Politique de confidentialité
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <PrivacyPolicyContent />
        </div>
      </DialogContent>
    </Dialog>
  )
}
