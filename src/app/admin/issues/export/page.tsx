import type { Metadata } from 'next'
import { BackButton } from '@/components/back-button'
import { BottomNav } from '@/components/bottom-nav'
import { FaunaFloraExportButton } from '@/components/fauna-flora-export-button'
import { ReportsCsvExport } from '@/components/reports-csv-export'
import { requireApprovedAccess } from '@/lib/auth/current-user'
import { MINISTRY_COLUMNS } from '@/lib/observations/export'

export const metadata: Metadata = {
  title: 'Exporter les signalements | Canopée',
  description: 'Export CSV des signalements reçus.',
}

export const dynamic = 'force-dynamic'

const SECTION_TITLE =
  'text-sm font-extrabold tracking-[0.08em] text-canopee-forest/50 uppercase'

const SECTION_HINT = 'text-sm text-canopee-forest/70'

export default async function AdminIssuesExportPage() {
  await requireApprovedAccess('pro')

  return (
    <div className="flex min-h-dvh w-full flex-col bg-canopee-cream">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pb-32 sm:px-6">
        <header className="sticky top-0 z-30 -mx-4 flex items-center gap-3 bg-canopee-cream/95 px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-3 backdrop-blur-sm sm:-mx-6 sm:px-6">
          <BackButton fallback="/admin/issues" />
          <h1 className="font-heading text-2xl text-canopee-forest sm:text-3xl">
            Exporter
          </h1>
        </header>

        <section className="flex flex-col gap-1.5">
          <h2 className={SECTION_TITLE}>Entretien et intervention</h2>
          <p className={SECTION_HINT}>
            Choisissez les colonnes à inclure, puis téléchargez le fichier CSV.
          </p>
          <ReportsCsvExport />
        </section>

        <section className="flex flex-col gap-1.5">
          <h2 className={SECTION_TITLE}>Faune et flore</h2>
          <p className={SECTION_HINT}>
            Les observations partent avec les colonnes attendues par le
            ministère.
          </p>
          <FaunaFloraExportButton columnCount={MINISTRY_COLUMNS.length} />
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
