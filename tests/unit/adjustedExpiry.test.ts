// Sets the timezone before anything touches Date, so the timezone
// regression tests below actually exercise a UTC+10 offset rather than
// silently passing in a UTC test runner. Node re-reads process.env.TZ on
// assignment, so this must stay above the imports.
process.env.TZ = 'Australia/Sydney'

import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  getAdjustedExpiry,
  getDaysRemaining,
  getExpiryStatus,
  todayLocal,
} from '../../src/lib/adjustedExpiry'
import type { FoodCategory, StorageLocation } from '../../src/hooks/useItems'

const CATEGORIES: FoodCategory[] = [
  'Dairy', 'Eggs', 'Meat', 'Seafood', 'Produce', 'Bakery',
  'Frozen', 'Microwave Meals', 'Beverages', 'Condiments', 'Snacks', 'Leftovers',
]
const LOCATIONS: StorageLocation[] = ['Fridge', 'Freezer', 'Pantry']

/** Printed expiry date (or, for Leftovers, the date prepared). */
const P = '2026-06-01'
/** Date opened, for the opened cases. */
const O = '2026-05-20'

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const earlier = (a: string, b: string) => (a <= b ? a : b)

/** Sentinel for "no adjusted date, show a safety message instead". */
const UNSAFE = 'UNSAFE'

/**
 * The complete expected rule set, transcribed from docs/decisions.md
 * ("Adjusted Expiry Date Algorithm") and docs/02-requirements.md, keyed
 * `category|storage|isOpened`. This is deliberately written out by hand
 * from the documentation rather than derived from the implementation, so
 * that it tests the algorithm against its spec rather than against itself.
 */
const EXPECTED: Record<string, string> = {
  'Dairy|Fridge|false': P,
  'Dairy|Fridge|true': earlier(P, addDays(O, 7)),
  'Dairy|Freezer|false': addDays(P, 60),
  'Dairy|Freezer|true': addDays(O, 30),
  'Dairy|Pantry|false': UNSAFE,
  'Dairy|Pantry|true': UNSAFE,

  'Eggs|Fridge|false': P,
  'Eggs|Fridge|true': addDays(O, 4),
  'Eggs|Freezer|false': UNSAFE,
  'Eggs|Freezer|true': UNSAFE,
  'Eggs|Pantry|false': addDays(P, -14),
  'Eggs|Pantry|true': UNSAFE,

  'Meat|Fridge|false': P,
  'Meat|Fridge|true': P,
  'Meat|Freezer|false': addDays(P, 270),
  'Meat|Freezer|true': addDays(O, 120),
  'Meat|Pantry|false': UNSAFE,
  'Meat|Pantry|true': UNSAFE,

  'Seafood|Fridge|false': P,
  'Seafood|Fridge|true': P,
  'Seafood|Freezer|false': addDays(P, 180),
  'Seafood|Freezer|true': addDays(O, 90),
  'Seafood|Pantry|false': UNSAFE,
  'Seafood|Pantry|true': UNSAFE,

  'Produce|Fridge|false': P,
  'Produce|Fridge|true': P,
  'Produce|Freezer|false': addDays(P, 180),
  'Produce|Freezer|true': addDays(P, 180),
  'Produce|Pantry|false': P,
  'Produce|Pantry|true': P,

  'Bakery|Fridge|false': addDays(P, 3),
  'Bakery|Fridge|true': addDays(P, 3),
  'Bakery|Freezer|false': addDays(P, 90),
  'Bakery|Freezer|true': addDays(O, 90),
  'Bakery|Pantry|false': P,
  'Bakery|Pantry|true': addDays(P, -2),

  'Frozen|Fridge|false': UNSAFE,
  'Frozen|Fridge|true': UNSAFE,
  'Frozen|Freezer|false': P,
  'Frozen|Freezer|true': earlier(P, addDays(O, 14)),
  'Frozen|Pantry|false': UNSAFE,
  'Frozen|Pantry|true': UNSAFE,

  'Microwave Meals|Fridge|false': UNSAFE,
  'Microwave Meals|Fridge|true': addDays(O, 3),
  'Microwave Meals|Freezer|false': P,
  'Microwave Meals|Freezer|true': UNSAFE,
  'Microwave Meals|Pantry|false': UNSAFE,
  'Microwave Meals|Pantry|true': UNSAFE,

  'Beverages|Fridge|false': P,
  'Beverages|Fridge|true': addDays(O, 7),
  'Beverages|Freezer|false': UNSAFE,
  'Beverages|Freezer|true': UNSAFE,
  'Beverages|Pantry|false': P,
  'Beverages|Pantry|true': addDays(O, 3),

  'Condiments|Fridge|false': P,
  'Condiments|Fridge|true': addDays(O, 30),
  'Condiments|Freezer|false': UNSAFE,
  'Condiments|Freezer|true': UNSAFE,
  'Condiments|Pantry|false': P,
  'Condiments|Pantry|true': addDays(O, 14),

  'Snacks|Fridge|false': P,
  'Snacks|Fridge|true': P,
  'Snacks|Freezer|false': addDays(P, 180),
  'Snacks|Freezer|true': addDays(P, 180),
  'Snacks|Pantry|false': P,
  'Snacks|Pantry|true': addDays(P, -30),

  'Leftovers|Fridge|false': addDays(P, 4),
  'Leftovers|Fridge|true': addDays(P, 4),
  'Leftovers|Freezer|false': addDays(P, 90),
  'Leftovers|Freezer|true': addDays(P, 90),
  'Leftovers|Pantry|false': UNSAFE,
  'Leftovers|Pantry|true': UNSAFE,
}

function evaluate(category: FoodCategory, storage: StorageLocation, isOpened: boolean) {
  return getAdjustedExpiry({
    category,
    storage_location: storage,
    expiry_date: P,
    is_opened: isOpened,
    date_opened: isOpened ? O : null,
  })
}

describe('getAdjustedExpiry: every category, location and opened state', () => {
  const cases = CATEGORIES.flatMap(category =>
    LOCATIONS.flatMap(storage =>
      [false, true].map(isOpened => ({ category, storage, isOpened })),
    ),
  )

  it('covers all 72 combinations with a documented expectation', () => {
    expect(cases).toHaveLength(72)
    for (const { category, storage, isOpened } of cases) {
      expect(EXPECTED[`${category}|${storage}|${isOpened}`], `no expectation for ${category}|${storage}|${isOpened}`).toBeDefined()
    }
  })

  it.each(cases)('$category in the $storage, opened=$isOpened', ({ category, storage, isOpened }) => {
    const expected = EXPECTED[`${category}|${storage}|${isOpened}`]
    const result = evaluate(category, storage, isOpened)
    const actual = result.safe ? result.adjustedDate : UNSAFE
    expect(actual).toBe(expected)
  })
})

describe('safety messages', () => {
  it('names a storage location in every unsafe message, so a blocked save tells the user where the item belongs', () => {
    for (const category of CATEGORIES) {
      for (const storage of LOCATIONS) {
        for (const isOpened of [false, true]) {
          const result = evaluate(category, storage, isOpened)
          if (!result.safe) {
            expect(result.message, `${category}/${storage}/opened=${isOpened}`).toMatch(/fridge|freezer|pantry/i)
          }
        }
      }
    }
  })
})

describe('getExpiryStatus thresholds', () => {
  it.each([
    [-30, 'expired'],
    [-1, 'expired'],
    [0, 'soon'],
    [1, 'soon'],
    [6, 'soon'],
    [7, 'soon'],
    [8, 'fresh'],
    [365, 'fresh'],
  ])('%i days remaining reads as %s', (days, status) => {
    expect(getExpiryStatus(days as number)).toBe(status)
  })

  it('treats exactly 0 days as expiring soon, not expired', () => {
    expect(getExpiryStatus(0)).toBe('soon')
  })
})

describe('todayLocal and getDaysRemaining use the local calendar date', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the local date, not the UTC one, when the two differ', () => {
    // 08:00 on 27 Aug in Sydney is still 22:00 on 26 Aug in UTC.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-26T22:00:00Z'))
    expect(todayLocal()).toBe('2026-08-27')
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-08-26')
  })

  it('regression (sweep finding 1): an item expiring today reads as 0 days left during the early-morning window', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-26T22:00:00Z'))
    expect(getDaysRemaining('2026-08-27')).toBe(0)
  })

  it('regression (sweep finding 1): an item that expired yesterday reads as Expired, not Expiring soon', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-26T22:00:00Z'))
    const days = getDaysRemaining('2026-08-26')
    expect(days).toBe(-1)
    expect(getExpiryStatus(days)).toBe('expired')
  })

  it('is stable across the whole day, not just the early-morning window', () => {
    vi.useFakeTimers()
    for (const hour of ['00:30', '09:59', '10:01', '13:00', '23:30']) {
      vi.setSystemTime(new Date(`2026-08-27T${hour}:00+10:00`))
      expect(todayLocal(), `at ${hour} Sydney time`).toBe('2026-08-27')
      expect(getDaysRemaining('2026-08-27'), `at ${hour} Sydney time`).toBe(0)
    }
  })
})
