'use client'

import { useEffect, useRef, useState } from 'react'
import { searchSpecies, type Species } from '@/lib/reports/species'
import type { ReportCategory } from '@/lib/reports/species'

interface SpeciesComboboxProps {
  value: string
  onChange: (value: string) => void
  category?: ReportCategory
  placeholder?: string
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
  value,
  onChange,
  category,
  placeholder = 'Nom commun ou scientifique',
}: SpeciesComboboxProps) {
  const [suggestions, setSuggestions] = useState<Species[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (value.trim()) {
      const results = searchSpecies(value, category, 20)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions(results)
      setIsOpen(results.length > 0)
      setSelectedIndex(-1)
    } else {
      setSuggestions([])
      setIsOpen(false)
    }
  }, [value, category])

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
    if (!isOpen || suggestions.length === 0) {
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
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (value.trim() && suggestions.length > 0) {
            setIsOpen(true)
          }
        }}
        placeholder={placeholder}
        className={FIELD}
      />

      {isOpen && suggestions.length > 0 && (
        <div className={SUGGESTIONS_CLASS}>
          {suggestions.map((species, index) => (
            <div
              key={`${index}-${species.category}-${species.scientificName}-${species.commonName}`}
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
