import { describe, expect, it } from 'vitest'
import {
  STORAGE_LOCATIONS,
  buildNeedsAttention,
  countByStatus,
  countByStorage,
  filterByStatus,
  sortByUrgency,
  statusPanelTitle,
} from '../../src/lib/dashboardStats'
import type { ItemWithStatus } from '../../src/lib/dashboardStats'
import type { BadgeStatus } from '../../src/lib/itemStatus'
import type { Item, StorageLocation } from '../../src/hooks/useItems'

function entry(id: string, badgeStatus: BadgeStatus, daysRemaining: number | null): ItemWithStatus {
  return {
    item: { id, name: id } as Item,
    badgeStatus,
    daysRemaining,
    countdownValue: daysRemaining === null ? null : Math.abs(daysRemaining),
    countdownLabel: null,
    result: daysRemaining === null
      ? { safe: false, message: 'unsafe' }
      : { safe: true, adjustedDate: '2026-09-01' },
  }
}

const mixed = [
  entry('fresh30', 'fresh', 30),
  entry('soon3', 'soon', 3),
  entry('expired10', 'expired', -10),
  entry('unsafe', 'warning', null),
  entry('soon0', 'soon', 0),
]

describe('sortByUrgency', () => {
  it('pins unsafe items first, then sorts ascending by days remaining', () => {
    expect(sortByUrgency(mixed).map(e => e.item.id))
      .toEqual(['unsafe', 'expired10', 'soon0', 'soon3', 'fresh30'])
  })

  it('does not mutate its input', () => {
    const before = mixed.map(e => e.item.id)
    sortByUrgency(mixed)
    expect(mixed.map(e => e.item.id)).toEqual(before)
  })
})

describe('buildNeedsAttention', () => {
  const entries = [
    entry('fresh', 'fresh', 40),
    entry('soon5', 'soon', 5),
    entry('soon1', 'soon', 1),
    entry('expired1', 'expired', -1),
    entry('expired9', 'expired', -9),
    entry('unsafe', 'warning', null),
  ]

  it('excludes fresh items, since this is what needs a look, not everything', () => {
    expect(buildNeedsAttention(entries, 99).map(e => e.item.id)).not.toContain('fresh')
  })

  it('orders unsafe first, then soonest-expiring, then most-recently-expired', () => {
    expect(buildNeedsAttention(entries, 99).map(e => e.item.id))
      .toEqual(['unsafe', 'soon1', 'soon5', 'expired1', 'expired9'])
  })

  it('honours the limit', () => {
    expect(buildNeedsAttention(entries, 2).map(e => e.item.id)).toEqual(['unsafe', 'soon1'])
  })
})

describe('countByStatus', () => {
  it('counts every badge state, including zero ones', () => {
    expect(countByStatus(mixed)).toEqual({ fresh: 1, soon: 2, expired: 1, warning: 1 })
  })

  it('returns zeroes for an empty list', () => {
    expect(countByStatus([])).toEqual({ fresh: 0, soon: 0, expired: 0, warning: 0 })
  })
})

describe('countByStorage', () => {
  it('counts across all three places', () => {
    const items = [
      { storage_location: 'Fridge' }, { storage_location: 'Fridge' },
      { storage_location: 'Pantry' },
    ] as Item[]
    expect(countByStorage(items)).toEqual({ Fridge: 2, Freezer: 0, Pantry: 1 })
  })
})

describe('filterByStatus', () => {
  it('returns everything for the Total tile', () => {
    expect(filterByStatus(mixed, 'all')).toHaveLength(5)
  })

  it('filters to one status and keeps the urgency order', () => {
    expect(filterByStatus(mixed, 'soon').map(e => e.item.id)).toEqual(['soon0', 'soon3'])
  })
})

describe('statusPanelTitle', () => {
  it('reads plainly, scoped or unscoped', () => {
    expect(statusPanelTitle('all')).toBe('All items')
    expect(statusPanelTitle('all', 'Fridge')).toBe('All Fridge items')
    expect(statusPanelTitle('expired')).toBe('Expired')
    expect(statusPanelTitle('expired', 'Fridge')).toBe('Expired in Fridge')
  })
})

describe('STORAGE_LOCATIONS', () => {
  it('is the three places the app supports', () => {
    expect(STORAGE_LOCATIONS).toEqual<StorageLocation[]>(['Fridge', 'Freezer', 'Pantry'])
  })
})
