'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type ReportPhotoModalProps = {
  src: string
  alt: string
  downloadFilename?: string
  children: React.ReactNode
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

export function ReportPhotoModal({
  src,
  alt,
  downloadFilename,
  children,
}: ReportPhotoModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent
        overlayClassName="bg-black/85 backdrop-blur-none"
        showCloseButton={false}
        className="w-auto max-w-[calc(100%-1.5rem)] place-items-center gap-0 rounded-2xl border-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={900}
          unoptimized
          className="max-h-[85dvh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
        />
        <div className="absolute top-2 right-2 flex items-center gap-2">
          <a
            href={src}
            download={downloadFilename}
            className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-black/70"
          >
            Télécharger
          </a>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Fermer l'aperçu"
              className="rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
            >
              <XIcon className="size-5" />
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}
