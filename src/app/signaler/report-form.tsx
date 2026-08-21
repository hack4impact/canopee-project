'use client'

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import Image from 'next/image'
import { Spinner } from '@/components/spinner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { isGeolocationAvailable } from '@/lib/mapbox'
import {
  REPORT_CATEGORIES,
  REPORT_CATEGORY_LABELS,
} from '@/lib/reports/categories'
import { downscalePhoto } from '@/lib/reports/downscale'
import {
  isValidReport,
  MAX_DESCRIPTION_LENGTH,
  validatePhoto,
  validateReport,
  type ReportErrors,
} from '@/lib/reports/validation'
import { submitReport, type ReportFormState } from './actions'

const initialState: ReportFormState = {}

const LOCATE_TIMEOUT_MS = 15_000

const FIELD =
  'rounded-lg border border-canopee-green/30 bg-white px-3 py-2.5 text-canopee-forest placeholder-zinc-500 transition-colors outline-none focus:border-canopee-green focus:ring-2 focus:ring-canopee-green/40'

const LABEL = 'text-sm font-medium text-canopee-forest'

const ERROR = 'text-sm font-medium text-canopee-coral-dark'

const UNSUPPORTED_MESSAGE =
  'Ce navigateur ne peut pas fournir votre position, nécessaire pour situer le signalement.'

const LOCATION_FAILURE: Record<number, string> = {
  1: 'Localisation refusée. Autorisez-la dans les réglages de votre navigateur pour envoyer un signalement.',
  2: 'Position indisponible. Placez-vous à découvert, puis réessayez.',
  3: 'La localisation a pris trop de temps. Réessayez.',
}

type Position = { latitude: number; longitude: number }

type LocationState =
  | { status: 'locating' }
  | { status: 'ready'; position: Position }
  | { status: 'failed'; message: string }

function subscribeToSupport(): () => void {
  return () => {}
}

function isSupportedOnServer(): boolean {
  return true
}

export function ReportForm() {
  const [state, formAction, pending] = useActionState(
    submitReport,
    initialState,
  )

  return (
    <div className="flex flex-col gap-4">
      {state.message && (
        <p aria-live="polite" className={ERROR}>
          {state.message}
        </p>
      )}

      {state.submittedId && (
        <p
          aria-live="polite"
          className="rounded-lg bg-canopee-green/10 px-3 py-2.5 text-sm font-medium text-canopee-forest"
        >
          Signalement envoyé. Merci!
        </p>
      )}

      <ReportFields
        key={state.submittedId ?? 'new'}
        formAction={formAction}
        pending={pending}
        serverErrors={state.errors}
      />
    </div>
  )
}

type ReportFieldsProps = {
  formAction: (formData: FormData) => void
  pending: boolean
  serverErrors?: ReportErrors
}

function UploadIcon({ className }: { className?: string }) {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5-5 5 5" />
      <path d="M12 5v12" />
    </svg>
  )
}

function MaximizeIcon({ className }: { className?: string }) {
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
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  )
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

function ReportFields({
  formAction,
  pending,
  serverErrors,
}: ReportFieldsProps) {
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [preparingPhoto, setPreparingPhoto] = useState(false)
  const [clientErrors, setClientErrors] = useState<ReportErrors>({})
  const [fix, setFix] = useState<LocationState | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const isSupported = useSyncExternalStore(
    subscribeToSupport,
    isGeolocationAvailable,
    isSupportedOnServer,
  )

  const location: LocationState = !isSupported
    ? { status: 'failed', message: UNSUPPORTED_MESSAGE }
    : (fix ?? { status: 'locating' })

  const errors = { ...serverErrors, ...clientErrors }

  useEffect(() => {
    if (!isSupported) {
      return
    }

    let cancelled = false

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return

        setFix({
          status: 'ready',
          position: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        })
      },
      (error) => {
        if (cancelled) return

        setFix({
          status: 'failed',
          message:
            LOCATION_FAILURE[error.code] ??
            'Impossible d’obtenir votre position.',
        })
      },
      { enableHighAccuracy: true, timeout: LOCATE_TIMEOUT_MS, maximumAge: 0 },
    )

    return () => {
      cancelled = true
    }
  }, [isSupported])

  useEffect(() => {
    if (!preview) {
      return
    }

    return () => URL.revokeObjectURL(preview)
  }, [preview])

  async function handlePhotoChange(file: File | null) {
    setClientErrors((current) => ({ ...current, photo: undefined }))

    if (!file) {
      setPhoto(null)
      setPreview(null)
      return
    }

    setPreparingPhoto(true)

    const prepared = await downscalePhoto(file)
    const photoError = validatePhoto(prepared)

    setPreparingPhoto(false)

    if (photoError) {
      setPhoto(null)
      setPreview(null)
      setClientErrors((current) => ({ ...current, photo: photoError }))

      if (photoInputRef.current) {
        photoInputRef.current.value = ''
      }

      return
    }

    setPhoto(prepared)
    setPreview(URL.createObjectURL(prepared))
  }

  function submit(formData: FormData) {
    const position = location.status === 'ready' ? location.position : null

    const found = validateReport({
      category,
      description,
      latitude: position?.latitude ?? null,
      longitude: position?.longitude ?? null,
    })

    setClientErrors(found)

    if (!isValidReport(found)) {
      return
    }

    if (photo) {
      formData.set('photo', photo)
    } else {
      formData.delete('photo')
    }

    formAction(formData)
  }

  const remaining = MAX_DESCRIPTION_LENGTH - description.trim().length

  return (
    <form action={submit} noValidate className="flex flex-col gap-4">
      {location.status === 'ready' && (
        <>
          <input
            type="hidden"
            name="latitude"
            value={location.position.latitude}
          />
          <input
            type="hidden"
            name="longitude"
            value={location.position.longitude}
          />
        </>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="category" className={LABEL}>
          Catégorie
        </label>
        <select
          id="category"
          name="category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-describedby={errors.category ? 'category-error' : undefined}
          className={FIELD}
        >
          <option value="">Choisissez une catégorie</option>
          {REPORT_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {REPORT_CATEGORY_LABELS[value]}
            </option>
          ))}
        </select>
        {errors.category && (
          <p id="category-error" className={ERROR}>
            {errors.category}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className={LABEL}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ce que vous avez observé, et où exactement."
          aria-describedby={
            errors.description ? 'description-error' : 'description-count'
          }
          className={`${FIELD} resize-y`}
        />
        <p
          id="description-count"
          className={`text-xs ${remaining < 0 ? 'text-canopee-coral-dark' : 'text-canopee-forest/60'}`}
        >
          {remaining} caractère{Math.abs(remaining) === 1 ? '' : 's'} restant
          {Math.abs(remaining) === 1 ? '' : 's'}
        </p>
        {errors.description && (
          <p id="description-error" className={ERROR}>
            {errors.description}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={LABEL}>
          Photo{' '}
          <span className="font-normal text-canopee-forest/60">
            (facultative)
          </span>
        </span>
        <input
          ref={photoInputRef}
          id="photo"
          name="photo"
          type="file"
          accept="image/*"
          onChange={(event) =>
            void handlePhotoChange(event.target.files?.[0] ?? null)
          }
          className="hidden"
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            aria-describedby={errors.photo ? 'photo-error' : undefined}
            className="inline-flex shrink-0 touch-manipulation items-center gap-2 rounded-lg border border-canopee-green bg-white px-3 py-2.5 text-sm font-medium text-canopee-forest transition-colors hover:bg-canopee-green/10 focus-visible:ring-2 focus-visible:ring-canopee-green/40 focus-visible:outline-none"
          >
            <UploadIcon className="h-5 w-5" />
            {photo ? 'Changer la photo' : 'Choisir une photo'}
          </button>

          <span className="min-w-0 break-all text-sm text-canopee-forest/60">
            {photo ? photo.name : 'Aucune photo choisie'}
          </span>
        </div>

        {preparingPhoto && (
          <p role="status" className="text-sm text-canopee-forest/70">
            Préparation de la photo…
          </p>
        )}

        {preview && (
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                aria-label="Agrandir l'aperçu de la photo"
                className="group relative mt-1 block w-full overflow-hidden rounded-lg text-left focus-visible:ring-2 focus-visible:ring-canopee-green/40 focus-visible:outline-none"
              >
                <Image
                  src={preview}
                  alt="Aperçu de la photo jointe au signalement"
                  width={320}
                  height={240}
                  unoptimized
                  className="h-40 w-full object-cover transition-transform duration-150 group-hover:scale-[1.02]"
                />
                <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                  <MaximizeIcon className="h-3.5 w-3.5" />
                  Agrandir
                </span>
              </button>
            </DialogTrigger>

            <DialogContent
              overlayClassName="bg-black/85 backdrop-blur-none"
              showCloseButton={false}
              className="w-auto max-w-[calc(100%-1.5rem)] place-items-center gap-0 rounded-2xl border-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-none"
            >
              <DialogTitle className="sr-only">Aperçu de la photo</DialogTitle>
              <Image
                src={preview}
                alt="Aperçu de la photo jointe au signalement"
                width={1200}
                height={900}
                unoptimized
                className="max-h-[85dvh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
              />
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  aria-label="Fermer l'aperçu"
                  className="absolute top-2 right-2 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
                >
                  <XIcon className="size-5" />
                </Button>
              </DialogClose>
            </DialogContent>
          </Dialog>
        )}

        {errors.photo && (
          <p id="photo-error" className={ERROR}>
            {errors.photo}
          </p>
        )}
      </div>

      {location.status === 'locating' && (
        <p role="status" className="text-sm text-canopee-forest/70">
          Recherche de votre position…
        </p>
      )}

      {location.status === 'failed' && (
        <p role="alert" className={ERROR}>
          {location.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || location.status !== 'ready' || preparingPhoto}
        className="inline-flex touch-manipulation items-center justify-center gap-2 rounded-lg bg-canopee-green px-4 py-2.5 font-bold text-white shadow-sm transition-[background-color,transform] duration-150 ease-out hover:bg-canopee-forest focus-visible:ring-2 focus-visible:ring-canopee-green/50 focus-visible:outline-none active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        {pending && <Spinner />}
        {pending ? 'Envoi…' : 'Envoyer le signalement'}
      </button>
    </form>
  )
}
