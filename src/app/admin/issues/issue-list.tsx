import Image from 'next/image'
import {
  REPORT_CATEGORY_LABELS,
  type ReportListItem,
} from '@/lib/reports/queries'
import { formatEventNumber } from '@/lib/reports/format'

const CARD = 'rounded-2xl border border-canopee-forest/10 bg-white/70 shadow-sm'

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function IssueList({ reports }: { reports: ReportListItem[] }) {
  if (reports.length === 0) {
    return (
      <p className={`px-5 py-8 text-center text-sm text-canopee-coral ${CARD}`}>
        Aucun signalement pour le moment.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {reports.map((report) => (
        <li
          key={report.id}
          className={`flex items-center gap-4 px-4 py-3 ${CARD}`}
        >
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-canopee-forest/5">
            {report.photoUrl ? (
              <Image
                src={report.photoUrl}
                alt=""
                width={56}
                height={56}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-heading text-sm text-canopee-coral-dark">
              {REPORT_CATEGORY_LABELS[report.category]}
            </span>
            <span className="text-xs text-canopee-coral">
              {formatEventNumber(report.eventNumber)} ·{' '}
              {formatDate(report.createdAt)}
            </span>
          </div>

          <span
            className={`shrink-0 rounded-md px-3 py-1 text-xs font-semibold ${
              report.resolvedAt ? 'text-canopee-forest' : 'text-canopee-coral'
            }`}
          >
            {report.resolvedAt ? 'Résolu' : 'En attente'}
          </span>
        </li>
      ))}
    </ul>
  )
}
