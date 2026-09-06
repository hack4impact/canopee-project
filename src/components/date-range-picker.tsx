'use client'

import { useState } from 'react'
import { CalendarIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { MonthYearSelect, type MonthYear } from '@/components/month-year-select'

const MONTH_ABBREVIATIONS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juill.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
]

export interface DateRange {
  from: Date
  to: Date
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
}

function toMonthYear(date: Date): MonthYear {
  return { month: date.getMonth(), year: date.getFullYear() }
}

function formatMonthYear(date: Date): string {
  return `${MONTH_ABBREVIATIONS[date.getMonth()]} ${date.getFullYear()}`
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [draftFrom, setDraftFrom] = useState<MonthYear>(toMonthYear(value.from))
  const [draftTo, setDraftTo] = useState<MonthYear>(toMonthYear(value.to))

  const isValidRange =
    new Date(draftFrom.year, draftFrom.month, 1) <=
    new Date(draftTo.year, draftTo.month, 1)

  function commit(nextFrom: MonthYear, nextTo: MonthYear) {
    setDraftFrom(nextFrom)
    setDraftTo(nextTo)

    const from = new Date(nextFrom.year, nextFrom.month, 1)
    const to = new Date(nextTo.year, nextTo.month + 1, 0)

    if (from <= to) {
      onChange({ from, to })
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="text-canopee-forest">
          <CalendarIcon data-icon="inline-start" />
          {formatMonthYear(value.from)} – {formatMonthYear(value.to)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto" align="start">
        <div className="flex flex-col gap-1.5">
          <Label>From</Label>
          <MonthYearSelect
            value={draftFrom}
            onChange={(next) => commit(next, draftTo)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>To</Label>
          <MonthYearSelect
            value={draftTo}
            onChange={(next) => commit(draftFrom, next)}
          />
        </div>
        {!isValidRange && (
          <p className="text-xs text-destructive">
            The end date must be after the start date.
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}

export function toDateParam(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function currentYearRange(): DateRange {
  const year = new Date().getFullYear()
  return { from: new Date(year, 0, 1), to: new Date(year, 11, 31) }
}
