import { describe, expect, it } from 'vitest'
import {
  allCategoriesSelected,
  groupState,
  pinCategoriesOfGroup,
  selectionToParam,
  toggleCategory,
  toggleGroup,
  PIN_GROUPS,
} from './filters'
import type { ReportCategory } from './categories'
import { PIN_CATEGORIES, PIN_EXCLUDED_CATEGORIES } from './pins'

describe('PIN_GROUPS', () => {
  it('keeps the groups that own pinnable categories', () => {
    expect(PIN_GROUPS).toEqual(['entretien', 'citoyen'])
  })

  it('leaves the fauna and flora categories out', () => {
    for (const group of PIN_GROUPS) {
      for (const category of pinCategoriesOfGroup(group)) {
        expect(PIN_EXCLUDED_CATEGORIES).not.toContain(category)
      }
    }
  })

  it('covers every pinnable category exactly once', () => {
    const covered = PIN_GROUPS.flatMap((group) => [
      ...pinCategoriesOfGroup(group),
    ])

    expect(covered.toSorted()).toEqual([...PIN_CATEGORIES].toSorted())
  })
})

describe('toggleCategory', () => {
  it('removes a checked category and puts it back', () => {
    const all = allCategoriesSelected()
    const without = toggleCategory(all, 'dangerous_tree')

    expect(without.has('dangerous_tree')).toBe(false)
    expect(without.size).toBe(all.size - 1)

    const restored = toggleCategory(without, 'dangerous_tree')

    expect(restored.has('dangerous_tree')).toBe(true)
    expect(restored.size).toBe(all.size)
  })

  it('does not mutate the selection it was given', () => {
    const all = allCategoriesSelected()

    toggleCategory(all, 'dangerous_tree')

    expect(all.has('dangerous_tree')).toBe(true)
  })
})

describe('groupState', () => {
  it('is all when everything is checked and none when nothing is', () => {
    expect(groupState(allCategoriesSelected(), 'entretien')).toBe('all')
    expect(groupState(new Set(), 'entretien')).toBe('none')
  })

  it('is some once a single category is unchecked', () => {
    const partial = toggleCategory(allCategoriesSelected(), 'dangerous_tree')

    expect(groupState(partial, 'entretien')).toBe('some')
    expect(groupState(partial, 'citoyen')).toBe('all')
  })
})

describe('toggleGroup', () => {
  it('clears a fully checked group without touching the other', () => {
    const cleared = toggleGroup(allCategoriesSelected(), 'entretien')

    expect(groupState(cleared, 'entretien')).toBe('none')
    expect(groupState(cleared, 'citoyen')).toBe('all')
  })

  it('fills a partially checked group instead of clearing it', () => {
    const partial = toggleCategory(allCategoriesSelected(), 'dangerous_tree')

    expect(groupState(toggleGroup(partial, 'entretien'), 'entretien')).toBe(
      'all',
    )
  })
})

describe('selectionToParam', () => {
  it('is null when every category is selected', () => {
    expect(selectionToParam(allCategoriesSelected())).toBeNull()
  })

  it('lists the selected categories in a stable order', () => {
    const selection = new Set<ReportCategory>([
      'unleashed_dog',
      'dangerous_tree',
    ])

    expect(selectionToParam(selection)).toBe(
      PIN_CATEGORIES.filter((category) => selection.has(category)).join(','),
    )
  })

  it('is empty when nothing is selected', () => {
    expect(selectionToParam(new Set())).toBe('')
  })
})
