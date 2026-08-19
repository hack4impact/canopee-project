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

      {/* Keyed on the new row's id: a successful submission remounts the
          fields, which clears them without resetting state from an effect. */}
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
        <label htmlFor="photo" className={LABEL}>
          Photo{' '}
          <span className="font-normal text-canopee-forest/60">
            (facultative)
          </span>
        </label>
        <input
          ref={photoInputRef}
          id="photo"
          name="photo"
          type="file"
          accept="image/*"
          onChange={(event) =>
            void handlePhotoChange(event.target.files?.[0] ?? null)
          }
          aria-describedby={errors.photo ? 'photo-error' : undefined}
          className={`${FIELD} file:mr-3 file:rounded-full file:border-0 file:bg-canopee-green file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white`}
        />

        {preparingPhoto && (
          <p role="status" className="text-sm text-canopee-forest/70">
            Préparation de la photo…
          </p>
        )}

        {preview && (
          <Image
            src={preview}
            alt="Aperçu de la photo jointe au signalement"
            width={320}
            height={240}
            unoptimized
            className="mt-1 h-40 w-full rounded-lg object-cover"
          />
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
