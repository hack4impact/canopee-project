'use client'

import { useState } from 'react'
import { CalendarIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { lastTwoMonthsRange, toDateParam } from '@/lib/reports/date-range'

const dateFormatter = new Intl.DateTimeFormat('fr-CA', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

/** "YYYY-MM-DD" strings, matching <input type="date"> and the export API's date params. */
export interface DateRangeValue {
  from: string
  to: string
}

interface DateRangeFilterProps {
  value: DateRangeValue
  onChange: (range: DateRangeValue) => void
}

function formatDateParam(value: string): string {
  return dateFormatter.format(new Date(`${value}T00:00:00Z`))
}

/** The default range: the last two months, ending today. */
function defaultRange(): DateRangeValue {
  const { from, to } = lastTwoMonthsRange()
  return { from: toDateParam(from), to: toDateParam(to) }
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [draft, setDraft] = useState<DateRangeValue>(value)

  const isValidRange =
    draft.from !== '' && draft.to !== '' && draft.from <= draft.to

  function commit(next: DateRangeValue) {
    setDraft(next)

    if (next.from !== '' && next.to !== '' && next.from <= next.to) {
      onChange(next)
    }
  }

  function reset() {
    commit(defaultRange())
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="text-canopee-forest">
          <CalendarIcon data-icon="inline-start" />
          {formatDateParam(value.from)} – {formatDateParam(value.to)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto" align="start">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date-range-from">Du</Label>
          <Input
            id="date-range-from"
            type="date"
            value={draft.from}
            max={draft.to}
            onChange={(event) => commit({ ...draft, from: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date-range-to">Au</Label>
          <Input
            id="date-range-to"
            type="date"
            value={draft.to}
            min={draft.from}
            onChange={(event) => commit({ ...draft, to: event.target.value })}
          />
        </div>
        {!isValidRange && (
          <p className="text-xs text-destructive">
            La date de fin doit être après la date de début.
          </p>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start text-canopee-forest/70"
          onClick={reset}
        >
          Réinitialiser
        </Button>
      </PopoverContent>
    </Popover>
  )
}
