import type { Metadata } from 'next'
import { ImageOffIcon } from 'lucide-react'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { BottomNav } from '@/components/bottom-nav'
import { HeroStats } from '@/components/hero-stats'
import { ReportPhotoModal } from '@/components/report-photo-modal'
import { ResolveReportButton } from '@/components/resolve-report-button'
import { requireApprovedAccess } from '@/lib/auth/current-user'
import {
  REPORT_CATEGORY_LABELS,
  REPORT_GROUP_LABELS,
  reportGroupOfCategory,
} from '@/lib/reports/categories'
import { formatEventNumber } from '@/lib/reports/format'
import { reportGroupColor } from '@/lib/reports/group-style'
import { getReportPhotoUrl } from '@/lib/reports/photo'
import { getReportById } from '@/lib/reports/queries'

export const metadata: Metadata = {
  title: 'Signalement | Canopée',
  description: 'Détail du signalement et suivi de sa résolution.',
}

export const dynamic = 'force-dynamic'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const CARD = 'rounded-2xl border border-canopee-forest/10 bg-white/70 shadow-sm'

const dateFormatter = new Intl.DateTimeFormat('fr-CA', {
  dateStyle: 'long',
  timeZone: 'America/Toronto',
})

const timeFormatter = new Intl.DateTimeFormat('fr-CA', {
  timeStyle: 'short',
  timeZone: 'America/Toronto',
})

export default async function AdminIssuePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireApprovedAccess('pro')

  const { id } = await params

  if (!UUID_PATTERN.test(id)) {
    notFound()
  }

  const report = await getReportById(id)

  if (!report) {
    notFound()
  }

  const photoUrl = report.photoUrl
    ? await getReportPhotoUrl(report.photoUrl)
    : null

  const resolved = report.resolvedAt !== null
  const group = reportGroupOfCategory(report.category)

  const facts: [string, string][] = [
    ['Signalé par', report.reporter],
    ['Position', report.woodedArea ?? 'Autre'],
    [
      'Coordonnées GPS',
      `${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`,
    ],
    ...(report.resolvedAt
      ? ([['Résolu le', dateFormatter.format(report.resolvedAt)]] as [
          string,
          string,
        ][])
      : []),
    ...([
      ['Espèce', report.species],
      ['Typologie', report.typology],
      ['Quantité', report.quantity === null ? null : String(report.quantity)],
      ['Unité', report.unit],
      ['Habitat', report.habitat],
      ['Statut relevé', report.statut],
    ].filter((entry) => Boolean(entry[1])) as [string, string][]),
  ]

  const stats = [
    { label: 'Reçu à', value: timeFormatter.format(report.createdAt) },
    { label: 'Numéro', value: formatEventNumber(report.eventNumber) },
    {
      label: 'Statut',
      value: resolved ? 'Résolu' : 'En attente',
      tone: resolved ? ('ok' as const) : ('alert' as const),
    },
  ]

  return (
    <div className="flex min-h-dvh w-full flex-col bg-canopee-cream">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 pb-32 sm:px-6">
        <header className="sticky top-0 z-30 -mx-4 bg-canopee-cream/95 px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-3 backdrop-blur-sm sm:-mx-6 sm:px-6 flex items-start gap-3">
          <BackButton fallback="/admin/issues" />
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl text-canopee-forest sm:text-3xl">
              {REPORT_CATEGORY_LABELS[report.category]}
            </h1>
            <p className="text-sm text-canopee-forest/70">
              {dateFormatter.format(report.createdAt)}
              <span className="mx-1.5 text-canopee-forest/30">·</span>
              <span style={{ color: reportGroupColor(report.category) }}>
                {REPORT_GROUP_LABELS[group]}
              </span>
            </p>
          </div>
        </header>

        <div className="relative">
          {photoUrl ? (
            <ReportPhotoModal
              src={photoUrl}
              alt={`Photo du signalement ${formatEventNumber(report.eventNumber)}`}
              downloadFilename={`signalement-${report.eventNumber}.jpg`}
            >
              <button
                type="button"
                className="block w-full overflow-hidden rounded-2xl focus-visible:ring-2 focus-visible:ring-canopee-green focus-visible:outline-none"
              >
                <Image
                  src={photoUrl}
                  alt=""
                  width={1200}
                  height={900}
                  unoptimized
                  className="h-[33dvh] max-h-72 min-h-52 w-full object-cover"
                />
              </button>
            </ReportPhotoModal>
          ) : (
            <div
              className="flex h-52 flex-col items-center justify-start gap-2 rounded-2xl border border-canopee-forest/10 pt-9"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(135deg, rgba(0,69,35,0.07) 0 3px, transparent 3px 12px)',
              }}
            >
              <ImageOffIcon
                aria-hidden="true"
                className="size-8 text-canopee-forest/35"
              />
              <p className="text-sm text-canopee-forest/50">
                Aucune photo jointe
              </p>
            </div>
          )}

          <HeroStats stats={stats} />
        </div>

        {report.description && (
          <section className="flex flex-col gap-2">
            <h2 className="font-heading text-lg text-canopee-forest">
              Description
            </h2>
            <p
              className={`px-5 py-4 text-sm leading-relaxed text-canopee-forest/80 ${CARD}`}
            >
              {report.description}
            </p>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-lg text-canopee-forest">Détails</h2>
          <dl className={`grid grid-cols-2 gap-4 px-5 py-4 ${CARD}`}>
            {facts.map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5">
                <dt className="text-[10px] font-semibold tracking-wide text-canopee-coral uppercase">
                  {label}
                </dt>
                <dd className="text-sm font-semibold text-canopee-forest">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {resolved ? (
          <p className={`px-5 py-4 text-sm text-canopee-forest/70 ${CARD}`}>
            Signalement clos.
          </p>
        ) : (
          <ResolveReportButton
            reportId={report.id}
            resolved={false}
            fullWidth
          />
        )}
      </main>

      <BottomNav />
    </div>
  )
}
