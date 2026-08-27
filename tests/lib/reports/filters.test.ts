import { describe, expect, it } from 'vitest'
import {
  allCategoriesSelected,
  categoriesOfGroup,
  groupState,
  observationCategoriesOf,
  selectionToParam,
  toggleCategory,
  toggleGroup,
  FILTER_GROUPS,
} from '@/lib/reports/filters'
import { OBSERVATION_CATEGORIES } from '@/lib/observations/collection'
import {
  REPORT_CATEGORIES,
  type ReportCategory,
} from '@/lib/reports/categories'
import { PIN_CATEGORIES } from '@/lib/reports/pins'

describe('FILTER_GROUPS', () => {
  it('offers the fauna and flora group alongside the pin groups', () => {
    expect(FILTER_GROUPS).toEqual(['entretien', 'citoyen', 'faune_flore'])
  })

  it('covers every category exactly once', () => {
    const covered = FILTER_GROUPS.flatMap((group) => [
      ...categoriesOfGroup(group),
    ])

    expect(covered.toSorted()).toEqual([...REPORT_CATEGORIES].toSorted())
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

  it('stays null when only the fauna and flora group is unchecked', () => {
    expect(
      selectionToParam(toggleGroup(allCategoriesSelected(), 'faune_flore')),
    ).toBeNull()
  })
})

describe('observationCategoriesOf', () => {
  it('keeps every fauna and flora category when nothing is unchecked', () => {
    expect(observationCategoriesOf(allCategoriesSelected())).toEqual(
      OBSERVATION_CATEGORIES,
    )
  })

  it('is empty once the group is cleared', () => {
    const cleared = toggleGroup(allCategoriesSelected(), 'faune_flore')

    expect(observationCategoriesOf(cleared)).toEqual([])
  })

  it('ignores the pin categories', () => {
    const selection = new Set<ReportCategory>(['dangerous_tree', 'oiseau'])

    expect(observationCategoriesOf(selection)).toEqual(['oiseau'])
  })
})
