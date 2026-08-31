'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { searchSpecies, type Species } from '@/lib/reports/species'
import type { ReportCategory } from '@/lib/reports/categories'

type SpeciesComboboxProps = {
  id: string
  value: string
  onChange: (value: string) => void
  category?: ReportCategory
  placeholder?: string
  describedBy?: string
}

const FIELD =
  'w-full rounded-lg border border-canopee-green/30 bg-white px-3 py-2.5 text-canopee-forest placeholder-zinc-500 transition-colors outline-none focus:border-canopee-green focus:ring-2 focus:ring-canopee-green/40'

const SUGGESTIONS_CLASS =
  'absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-canopee-green/30 bg-white shadow-lg'

const SUGGESTION_ITEM =
  'px-3 py-2 cursor-pointer transition-colors hover:bg-canopee-green/10'

const SUGGESTION_ITEM_ACTIVE =
  'bg-canopee-green/20 border-l-4 border-canopee-green'

export function SpeciesCombobox({
  id,
  value,
  onChange,
  category,
  placeholder = 'Nom commun ou scientifique',
  describedBy,
}: SpeciesComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  const suggestions = useMemo<Species[]>(
    () => (value.trim() ? searchSpecies(value, category, 20) : []),
    [value, category],
  )

  const expanded = isOpen && suggestions.length > 0
  const listboxId = `${id}-listbox`

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!expanded) {
      if (e.key === 'Enter') {
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0,
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1,
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          const selected = suggestions[selectedIndex]
          onChange(selected.commonName)
          setIsOpen(false)
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        break
    }
  }

  function handleSuggestionClick(species: Species) {
    onChange(species.commonName)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          selectedIndex >= 0 ? `${id}-option-${selectedIndex}` : undefined
        }
        aria-describedby={describedBy}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setSelectedIndex(-1)
          setIsOpen(true)
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={FIELD}
      />

      {expanded && (
        <div id={listboxId} role="listbox" className={SUGGESTIONS_CLASS}>
          {suggestions.map((species, index) => (
            <div
              key={`${species.category}-${species.scientificName}-${species.commonName}`}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={index === selectedIndex}
              onClick={() => handleSuggestionClick(species)}
              className={`${SUGGESTION_ITEM} ${
                index === selectedIndex ? SUGGESTION_ITEM_ACTIVE : ''
              }`}
            >
              <div className="font-medium text-canopee-forest">
                {species.commonName}
              </div>
              <div className="text-xs text-canopee-forest/60 italic">
                {species.scientificName}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
