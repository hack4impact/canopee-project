'use client'

import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  REPORT_HISTORY_SORT_LABELS,
  REPORT_HISTORY_SORTS,
  type ReportHistorySort,
  type ReportHistoryStatus,
} from '@/lib/reports/history'

export function ReportHistorySort({
  sort,
  status,
}: {
  sort: ReportHistorySort
  status: ReportHistoryStatus
}) {
  const router = useRouter()

  function change(value: string) {
    router.replace(`/signalements?statut=${status}&tri=${value}`)
  }

  return (
    <Select value={sort} onValueChange={change}>
      <SelectTrigger
        size="sm"
        aria-label="Trier les signalements"
        className="w-auto shrink-0 font-bold text-canopee-forest"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {REPORT_HISTORY_SORTS.map((value) => (
          <SelectItem key={value} value={value}>
            {REPORT_HISTORY_SORT_LABELS[value]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
