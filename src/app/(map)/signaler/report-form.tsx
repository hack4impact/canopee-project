'use client'

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import Image from 'next/image'
import { ReportLocationPicker } from '@/components/report-location-picker'
import { SpeciesPicto } from '@/components/species-picto'
import { Spinner } from '@/components/spinner'
import { isGeolocationAvailable } from '@/lib/mapbox'
import {
  FAUNE_FLORE_STATUTS,
  REPORT_CATEGORY_LABELS,
  REPORT_GROUP_CATEGORIES,
  REPORT_GROUP_LABELS,
  REPORT_TYPOLOGIES,
  REPORT_TYPOLOGY_LABELS,
  REPORT_UNITS,
  type ReportGroup,
} from '@/lib/reports/categories'
import { downscalePhoto } from '@/lib/reports/downscale'
import { type ReportPosition } from '@/lib/reports/location'
import {
  isValidReport,
  MAX_DESCRIPTION_LENGTH,
  validatePhoto,
  validateReport,
  type ReportErrors,
} from '@/lib/reports/validation'
import { submitReport, type ReportFormState } from './actions'
import { REPORT_THEMES } from './report-theme'

const initialState: ReportFormState = {}

const LOCATE_TIMEOUT_MS = 15_000

const FIELD =
  'rounded-lg border border-canopee-green/30 bg-white px-3 py-2.5 text-canopee-forest placeholder-zinc-500 transition-colors outline-none focus:border-canopee-green focus:ring-2 focus:ring-canopee-green/40'

const LABEL = 'text-sm font-medium text-canopee-forest'

const ERROR = 'text-sm font-medium text-canopee-coral-dark'

const MAP_CONTROL =
  'absolute top-2 right-2 z-10 inline-flex touch-manipulation items-center rounded-lg border border-canopee-green/40 bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-canopee-forest shadow-sm backdrop-blur-sm transition-colors hover:bg-canopee-green/10 focus-visible:ring-2 focus-visible:ring-canopee-green/40 focus-visible:outline-none'

const UNSUPPORTED_MESSAGE =
  'Ce navigateur ne peut pas fournir votre position. Placez le repère sur la carte.'

const LOCATION_FAILURE: Record<number, string> = {
  1: 'Localisation refusée. Autorisez-la dans vos réglages, ou placez le repère sur la carte.',
  2: 'Position indisponible. Placez-vous à découvert et réessayez, ou placez le repère sur la carte.',
  3: 'La localisation a pris trop de temps. Réessayez, ou placez le repère sur la carte.',
}

type FixState =
  | { status: 'locating' }
  | { status: 'ready'; position: ReportPosition }
  | { status: 'failed'; message: string }

function subscribeToSupport(): () => void {
  return () => {}
}

function isSupportedOnServer(): boolean {
  return true
}

export function ReportForm({
  group,
  onBack,
  photoRequired,
}: {
  group: ReportGroup
  onBack: () => void
  photoRequired: boolean
}) {
  const [state, formAction, pending] = useActionState(
    submitReport,
    initialState,
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex touch-manipulation items-center gap-1.5 self-start rounded-lg px-2 py-1.5 text-sm font-semibold text-canopee-forest/70 transition-colors hover:bg-canopee-green/10 hover:text-canopee-forest focus-visible:ring-2 focus-visible:ring-canopee-green/40 focus-visible:outline-none"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="m12 19-7-7 7-7" />
          <path d="M19 12H5" />
        </svg>
        Changer de type
      </button>

      <h2 className={`font-heading text-lg ${REPORT_THEMES[group].accent}`}>
        {REPORT_GROUP_LABELS[group]}
      </h2>

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

      <ReportWizard
        key={state.submittedId ?? 'new'}
        group={group}
        photoRequired={photoRequired}
        formAction={formAction}
        pending={pending}
        serverErrors={state.errors}
      />
    </div>
  )
}

type ReportWizardProps = {
  group: ReportGroup
  photoRequired: boolean
  formAction: (formData: FormData) => void
  pending: boolean
  serverErrors?: ReportErrors
}

type StepKey =
  | 'constate'
  | 'typologie'
  | 'categorie'
  | 'statut'
  | 'photo'
  | 'nombre'
  | 'espece'
  | 'details'
  | 'commentaire'
  | 'position'

const STEP_TITLES: Record<StepKey, string> = {
  constate: 'Qu’avez-vous constaté ?',
  typologie: 'Typologie',
  categorie: 'Sélectionnez la catégorie observée',
  statut: "Quel est le statut de l'espèce ?",
  photo: 'Photo',
  nombre: 'Combien ?',
  espece: 'Quelle espèce avez-vous observé ?',
  details: 'Détails',
  commentaire: 'Commentaire',
  position: 'Où exactement ?',
}

/** Step order per group, following the Google Sheets spec. */
const GROUP_STEPS: Record<ReportGroup, readonly StepKey[]> = {
  entretien: ['constate', 'typologie', 'photo', 'commentaire', 'position'],
  citoyen: ['constate', 'photo', 'nombre', 'commentaire', 'position'],
  faune_flore: [
    'categorie',
    'statut',
    'photo',
    'espece',
    'details',
    'position',
  ],
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

function ReportWizard({
  group,
  photoRequired,
  formAction,
  pending,
  serverErrors,
}: ReportWizardProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [category, setCategory] = useState('')
  const [statut, setStatut] = useState('')
  const [typology, setTypology] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('')
  const [species, setSpecies] = useState('')
  const [unit, setUnit] = useState('')
  const [habitat, setHabitat] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [preparingPhoto, setPreparingPhoto] = useState(false)
  const [clientErrors, setClientErrors] = useState<ReportErrors>({})
  const [fix, setFix] = useState<FixState>({ status: 'locating' })
  const [override, setOverride] = useState<ReportPosition | null>(null)
  const [locateAttempt, setLocateAttempt] = useState(0)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const isSupported = useSyncExternalStore(
    subscribeToSupport,
    isGeolocationAvailable,
    isSupportedOnServer,
  )

  const gpsFix: FixState = isSupported
    ? fix
    : { status: 'failed', message: UNSUPPORTED_MESSAGE }

  const position: ReportPosition | null =
    override ?? (gpsFix.status === 'ready' ? gpsFix.position : null)

  const errors = { ...serverErrors, ...clientErrors }

  const steps = GROUP_STEPS[group]
  const step = steps[stepIndex]

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
  }, [isSupported, locateAttempt])

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

  function stepIsComplete(key: StepKey): boolean {
    switch (key) {
      case 'constate':
        return category !== ''
      case 'typologie':
        return typology !== ''
      case 'categorie':
        return category !== ''
      case 'statut':
        return statut !== ''
      case 'photo':
        return photo !== null || !photoRequired
      case 'nombre':
        return quantity === '' || Number.isInteger(Number(quantity))
      case 'espece':
        return species.trim() !== ''
      case 'details':
        return description.trim() !== ''
      case 'commentaire':
        return description.trim() !== ''
      case 'position':
        return position !== null
    }
  }

  function next() {
    setClientErrors((current) => {
      const cleared = { ...current }
      delete cleared.category
      delete cleared.statut
      delete cleared.typology
      delete cleared.species
      delete cleared.photo
      delete cleared.quantity
      delete cleared.unit
      delete cleared.habitat
      return cleared
    })

    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1)
    }
  }

  function back() {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1)
    }
  }

  function submit(formData: FormData) {
    const found = validateReport({
      category,
      description,
      latitude: position?.latitude ?? null,
      longitude: position?.longitude ?? null,
      typology,
      quantity,
      species,
      unit,
      habitat,
      statut,
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

  const isLastStep = stepIndex === steps.length - 1
  const remaining = MAX_DESCRIPTION_LENGTH - description.trim().length

  return (
    <form
      action={submit}
      noValidate
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      <div className="flex shrink-0 flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold tracking-wide text-canopee-forest/60 uppercase">
            Étape {stepIndex + 1} / {steps.length}
          </p>
          <div className="flex gap-1">
            {steps.map((key, index) => (
              <span
                key={key}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  index === stepIndex
                    ? `w-6 ${REPORT_THEMES[group].bar}`
                    : index < stepIndex
                      ? 'w-3 bg-canopee-green/50'
                      : 'w-3 bg-canopee-green/15'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>

        <p className="text-sm font-semibold text-canopee-forest">
          {STEP_TITLES[step]}
        </p>
      </div>

      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="typology" value={typology} />
      <input type="hidden" name="quantity" value={quantity} />
      <input type="hidden" name="species" value={species} />
      <input type="hidden" name="unit" value={unit} />
      <input type="hidden" name="habitat" value={habitat} />
      <input type="hidden" name="statut" value={statut} />

      {position && (
        <>
          <input type="hidden" name="latitude" value={position.latitude} />
          <input type="hidden" name="longitude" value={position.longitude} />
        </>
      )}

      <div className="scroll-visible flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain pr-3">
        {step === 'constate' && (
          <div className="flex flex-col gap-2">
            {REPORT_GROUP_CATEGORIES[group].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                aria-pressed={category === value}
                className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-canopee-green/40 focus-visible:outline-none ${
                  category === value
                    ? 'border-canopee-green bg-canopee-green/10 text-canopee-forest'
                    : 'border-canopee-green/25 bg-white text-canopee-forest hover:border-canopee-green/60'
                }`}
              >
                {REPORT_CATEGORY_LABELS[value]}
              </button>
            ))}
            {errors.category && (
              <p id="category-error" className={ERROR}>
                {errors.category}
              </p>
            )}
          </div>
        )}

        {step === 'typologie' && (
          <div className="flex flex-col gap-2">
            {REPORT_TYPOLOGIES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTypology(value)}
                aria-pressed={typology === value}
                className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-canopee-green/40 focus-visible:outline-none ${
                  typology === value
                    ? 'border-canopee-green bg-canopee-green/10 text-canopee-forest'
                    : 'border-canopee-green/25 bg-white text-canopee-forest hover:border-canopee-green/60'
                }`}
              >
                {REPORT_TYPOLOGY_LABELS[value]}
              </button>
            ))}
            {errors.typology && (
              <p id="typology-error" className={ERROR}>
                {errors.typology}
              </p>
            )}
          </div>
        )}

        {step === 'categorie' && group === 'faune_flore' && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
              {REPORT_GROUP_CATEGORIES.faune_flore.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  aria-pressed={category === value}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition-colors focus-visible:ring-2 focus-visible:ring-canopee-green/40 focus-visible:outline-none ${
                    category === value
                      ? 'border-canopee-green bg-canopee-green/10'
                      : 'border-canopee-green/25 bg-white hover:border-canopee-green/60'
                  }`}
                >
                  <SpeciesPicto
                    name={value === 'plante_vasculaire' ? 'vasculaire' : value}
                    className="h-6 w-6 text-canopee-green"
                  />
                  <span className="text-xs font-medium text-canopee-forest">
                    {REPORT_CATEGORY_LABELS[value]}
                  </span>
                </button>
              ))}
            </div>
            {errors.category && (
              <p id="category-error" className={ERROR}>
                {errors.category}
              </p>
            )}
          </div>
        )}

        {step === 'statut' && group === 'faune_flore' && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-canopee-forest/60">Échelle de menace</p>
            <div className="flex flex-col gap-1">
              {FAUNE_FLORE_STATUTS.map(({ value, label }, index) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatut(value)}
                  aria-pressed={statut === value}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-canopee-green/40 focus-visible:outline-none ${
                    statut === value
                      ? 'border-canopee-green bg-canopee-green/10 text-canopee-forest'
                      : 'border-canopee-green/25 bg-white text-canopee-forest hover:border-canopee-green/60'
                  }`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-canopee-green/15 text-xs font-bold text-canopee-green">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
            {errors.statut && (
              <p id="statut-error" className={ERROR}>
                {errors.statut}
              </p>
            )}
          </div>
        )}

        {step === 'espece' && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="species" className={LABEL}>
              Espèce observée
            </label>
            <input
              id="species"
              name="species"
              type="text"
              value={species}
              onChange={(event) => setSpecies(event.target.value)}
              placeholder="Nom commun ou scientifique, si vous le connaissez."
              aria-describedby={errors.species ? 'species-error' : undefined}
              className={FIELD}
            />
            {errors.species && (
              <p id="species-error" className={ERROR}>
                {errors.species}
              </p>
            )}
          </div>
        )}

        {step === 'photo' && (
          <div className="flex flex-col gap-1.5">
            <span className={LABEL}>Veuillez ajouter une photo</span>
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
        )}

        {step === 'nombre' && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="quantity" className={LABEL}>
              Combien ?
            </label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              inputMode="numeric"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="Nombre d’éléments observés (facultatif)"
              aria-describedby={errors.quantity ? 'quantity-error' : undefined}
              className={FIELD}
            />
            {errors.quantity && (
              <p id="quantity-error" className={ERROR}>
                {errors.quantity}
              </p>
            )}
            <p className="text-xs text-canopee-forest/60">
              Facultatif — vous pouvez passer à l’étape suivante.
            </p>
          </div>
        )}

        {step === 'details' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="unit" className={LABEL}>
                Unité
              </label>
              <select
                id="unit"
                name="unit"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                className={FIELD}
              >
                <option value="">—</option>
                {REPORT_UNITS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              {errors.unit && (
                <p id="unit-error" className={ERROR}>
                  {errors.unit}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="habitat" className={LABEL}>
                Habitat
              </label>
              <input
                id="habitat"
                name="habitat"
                type="text"
                value={habitat}
                onChange={(event) => setHabitat(event.target.value)}
                placeholder="Où l’espèce a-t-elle été observée ? (facultatif)"
                aria-describedby={errors.habitat ? 'habitat-error' : undefined}
                className={FIELD}
              />
              {errors.habitat && (
                <p id="habitat-error" className={ERROR}>
                  {errors.habitat}
                </p>
              )}
            </div>

            <CommentField
              description={description}
              setDescription={setDescription}
              errors={errors}
              remaining={remaining}
            />
          </div>
        )}

        {step === 'commentaire' && (
          <CommentField
            description={description}
            setDescription={setDescription}
            errors={errors}
            remaining={remaining}
          />
        )}

        {step === 'position' && (
          <div className="flex flex-col gap-1.5">
            <div className="relative">
              <ReportLocationPicker
                position={position}
                onPositionChange={setOverride}
                disabled={pending}
              />

              {override && gpsFix.status === 'ready' && (
                <button
                  type="button"
                  onClick={() => setOverride(null)}
                  aria-label="Revenir à ma position GPS"
                  className={MAP_CONTROL}
                >
                  Ma position GPS
                </button>
              )}

              {isSupported && gpsFix.status === 'failed' && (
                <button
                  type="button"
                  onClick={() => {
                    setFix({ status: 'locating' })
                    setLocateAttempt((attempt) => attempt + 1)
                  }}
                  aria-label="Réessayer la localisation"
                  className={MAP_CONTROL}
                >
                  Réessayer
                </button>
              )}
            </div>

            <p aria-live="polite" className="text-sm text-canopee-forest/70">
              {!position
                ? 'Touchez la carte pour placer le repère à l’endroit du problème.'
                : override
                  ? 'Repère placé à la main. Touchez la carte ou faites-le glisser pour l’ajuster.'
                  : 'Position GPS. Touchez la carte ou faites glisser le repère pour la corriger.'}
            </p>

            {gpsFix.status === 'locating' && !override && (
              <p role="status" className="text-sm text-canopee-forest/70">
                Recherche de votre position…
              </p>
            )}

            {gpsFix.status === 'failed' && (
              <p
                role="alert"
                className={`text-sm ${position ? 'text-canopee-forest/70' : 'font-medium text-canopee-coral-dark'}`}
              >
                {gpsFix.message}
              </p>
            )}

            {errors.latitude && (
              <p id="latitude-error" className={ERROR}>
                {errors.latitude}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={back}
            disabled={stepIndex === 0}
            className="inline-flex touch-manipulation items-center gap-1.5 rounded-lg border border-canopee-green/30 bg-white px-4 py-2.5 text-sm font-semibold text-canopee-forest transition-colors hover:bg-canopee-green/10 focus-visible:ring-2 focus-visible:ring-canopee-green/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            Retour
          </button>

          {isLastStep ? (
            <button
              type="submit"
              disabled={pending || preparingPhoto || !stepIsComplete(step)}
              className="inline-flex touch-manipulation items-center justify-center gap-2 rounded-lg bg-canopee-green px-4 py-2.5 font-bold text-white shadow-sm transition-[background-color,transform] duration-150 ease-out hover:bg-canopee-forest focus-visible:ring-2 focus-visible:ring-canopee-green/50 focus-visible:outline-none active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              {pending && <Spinner />}
              {pending ? 'Envoi…' : 'Envoyer le signalement'}
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              disabled={!stepIsComplete(step) || preparingPhoto}
              className="inline-flex touch-manipulation items-center justify-center gap-2 rounded-lg bg-canopee-green px-4 py-2.5 font-bold text-white shadow-sm transition-[background-color,transform] duration-150 ease-out hover:bg-canopee-forest focus-visible:ring-2 focus-visible:ring-canopee-green/50 focus-visible:outline-none active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              Suivant
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </form>
  )
}

function CommentField({
  description,
  setDescription,
  errors,
  remaining,
}: {
  description: string
  setDescription: (value: string) => void
  errors: ReportErrors
  remaining: number
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="description" className={LABEL}>
        Commentaire
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
  )
}
