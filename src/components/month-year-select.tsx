'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export interface MonthYear {
  month: number // 0-11
  year: number
}

interface MonthYearSelectProps {
  value: MonthYear
  onChange: (value: MonthYear) => void
  yearRange?: { from: number; to: number }
}

export function MonthYearSelect({
  value,
  onChange,
  yearRange,
}: MonthYearSelectProps) {
  const currentYear = new Date().getFullYear()
  const { from, to } = yearRange ?? {
    from: currentYear - 5,
    to: currentYear + 1,
  }
  const years = Array.from({ length: to - from + 1 }, (_, i) => from + i)

  return (
    <div className="flex gap-2">
      <Select
        value={String(value.month)}
        onValueChange={(month) => onChange({ ...value, month: Number(month) })}
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTH_NAMES.map((name, index) => (
            <SelectItem key={name} value={String(index)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={String(value.year)}
        onValueChange={(year) => onChange({ ...value, year: Number(year) })}
      >
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={String(year)}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
