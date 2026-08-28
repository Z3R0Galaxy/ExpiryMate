/**
 * Adjusted Expiry Date Algorithm — implements the category/storage/opened
 * rules documented in docs/decisions.md ("Adjusted Expiry Date Algorithm"),
 * sourced from the USDA FoodSafety.gov Cold Food Storage Chart.
 *
 * This is a pure function deliberately kept free of React/Supabase — it
 * takes plain item fields in, returns a plain result out, so it can be unit
 * tested in isolation (tests/unit) without mounting any component.
 *
 * Three categories needed reconciliation between this algorithm and the
 * actual `food_category` DB enum before this could be written correctly —
 * see decisions.md, "Category/algorithm reconciliation" (18/8/26):
 *   - Snacks reuses the algorithm's "Dry Goods" rules (closest match).
 *   - Frozen (pre-frozen store-bought food) has its own new rule set —
 *     there was no algorithm section for it at all.
 *   - Eggs was added as an 11th DB category so its already-written rules
 *     are actually reachable (previously eggs had nowhere correct to go).
 *
 * A second, smaller ambiguity: several freezer rules are written against
 * "date of freezing," but the schema has no separate "date frozen" field —
 * only the printed expiry date and (when opened) date_opened. Resolved by
 * anchoring on date_opened when the item is opened, and on the printed
 * expiry date when it isn't, which is the same anchor pattern the algorithm
 * already uses unambiguously elsewhere (e.g. Dairy's freezer rows).
 */

import type { FoodCategory, StorageLocation } from '../hooks/useItems'

export interface AdjustedExpiryInput {
  category: FoodCategory
  storage_location: StorageLocation
  /** Printed expiry date — or, for Leftovers, the date prepared. */
  expiry_date: string
  is_opened: boolean
  date_opened: string | null
}

export type AdjustedExpiryResult =
  | { safe: true; adjustedDate: string }
  // Covers both genuine food-safety "unsafe" cases (e.g. raw meat in the
  // pantry) and "not applicable/not recommended" cases (e.g. freezing most
  // beverages) — both mean "no adjusted date, show this explanation instead."
  | { safe: false; message: string }

export type ExpiryStatus = 'expired' | 'soon' | 'fresh'

// --- date helpers -----------------------------------------------------
// Dates are plain 'YYYY-MM-DD' strings, the same format <input type="date">
// already uses throughout the app. Parsed/compared as UTC midnight so day
// arithmetic can't drift a day depending on the browser's local timezone.

function parseDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`)
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr)
  d.setUTCDate(d.getUTCDate() + days)
  return toDateString(d)
}

function earlierOf(a: string, b: string): string {
  return parseDate(a).getTime() <= parseDate(b).getTime() ? a : b
}

/**
 * Today's date in the user's own local timezone, as a 'YYYY-MM-DD' string.
 *
 * Deliberately NOT `new Date().toISOString().slice(0, 10)`, which reads
 * UTC's calendar date instead of the local one. For any timezone ahead of
 * UTC (e.g. Australia/Sydney, UTC+10) that UTC date lags a day behind the
 * real local date for the first several hours of every day.
 *
 * This used to read the UTC date, which meant every countdown in the app
 * ran one day high between midnight and 10am local time, and an item that
 * had expired the previous day still showed as "Expiring soon" rather than
 * "Expired" (fixed 27/8/26 - see the sweep report, finding 1). It is the
 * same bug validateItem.ts already fixed for the date-opened check in
 * Feedback Sprint 2; that fix simply never reached the countdown.
 *
 * Defined here, in the lowest-level module, and re-exported by
 * validateItem.ts so that every "what is today, for a date-only field"
 * check in the app resolves to this one function rather than each caller
 * reinventing its own idea of today.
 */
export function todayLocal(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function ok(adjustedDate: string): AdjustedExpiryResult {
  return { safe: true, adjustedDate }
}

function warn(message: string): AdjustedExpiryResult {
  return { safe: false, message }
}

/** date_opened when opened, falling back to the printed date defensively —
 *  the form + DB constraint both require date_opened whenever is_opened is
 *  true, so this fallback should never actually be exercised. */
function openedAnchor(item: AdjustedExpiryInput): string {
  return item.date_opened ?? item.expiry_date
}

// --- per-category rules -------------------------------------------------

function evalDairy(item: AdjustedExpiryInput): AdjustedExpiryResult {
  const { storage_location, is_opened, expiry_date } = item
  if (storage_location === 'Pantry') {
    return warn('Unsafe — dairy should not be stored in the pantry. Store it in the fridge or freezer instead.')
  }
  if (storage_location === 'Fridge') {
    if (!is_opened) return ok(expiry_date)
    return ok(earlierOf(expiry_date, addDays(openedAnchor(item), 7)))
  }
  // Freezer
  if (!is_opened) return ok(addDays(expiry_date, 60))
  return ok(addDays(openedAnchor(item), 30))
}

function evalMeatOrSeafood(
  item: AdjustedExpiryInput,
  categoryLabel: string,
  freezerUnopenedDays: number,
  freezerOpenedDays: number,
): AdjustedExpiryResult {
  const { storage_location, is_opened, expiry_date } = item
  if (storage_location === 'Pantry') {
    return warn(`Unsafe — ${categoryLabel.toLowerCase()} should not be stored in the pantry. Store it in the fridge or freezer instead.`)
  }
  if (storage_location === 'Fridge') {
    // Fridge rules apply regardless of whether it's been opened/sealed.
    return ok(expiry_date)
  }
  // Freezer — anchored on date_opened if opened, else the printed date.
  const anchor = is_opened ? openedAnchor(item) : expiry_date
  return ok(addDays(anchor, is_opened ? freezerOpenedDays : freezerUnopenedDays))
}

function evalEggs(item: AdjustedExpiryInput): AdjustedExpiryResult {
  const { storage_location, is_opened, expiry_date } = item
  if (storage_location === 'Freezer') {
    return warn('Unsafe — eggs cannot be safely frozen in the shell. Store them in the fridge instead.')
  }
  if (storage_location === 'Pantry') {
    if (is_opened) return warn('Unsafe — cracked or separated eggs should not be stored in the pantry. Store them in the fridge instead.')
    return ok(addDays(expiry_date, -14))
  }
  // Fridge
  if (!is_opened) return ok(expiry_date)
  return ok(addDays(openedAnchor(item), 4))
}

function evalProduce(item: AdjustedExpiryInput): AdjustedExpiryResult {
  if (item.storage_location === 'Freezer') return ok(addDays(item.expiry_date, 180))
  // Fridge or Pantry, either opened state — no change.
  return ok(item.expiry_date)
}

function evalLeftovers(item: AdjustedExpiryInput): AdjustedExpiryResult {
  // expiry_date holds the "date prepared" for this category (see decisions.md).
  if (item.storage_location === 'Pantry') {
    return warn('Unsafe — cooked meals/leftovers should not be stored in the pantry. Store it in the fridge or freezer instead.')
  }
  const days = item.storage_location === 'Fridge' ? 4 : 90 // Freezer
  return ok(addDays(item.expiry_date, days))
}

function evalBeverages(item: AdjustedExpiryInput): AdjustedExpiryResult {
  const { storage_location, is_opened, expiry_date } = item
  if (storage_location === 'Freezer') {
    return warn('Not recommended — freezing is not advised for most beverages. Store it in the fridge or pantry instead.')
  }
  if (!is_opened) return ok(expiry_date)
  const days = storage_location === 'Fridge' ? 7 : 3 // Pantry
  return ok(addDays(openedAnchor(item), days))
}

function evalCondiments(item: AdjustedExpiryInput): AdjustedExpiryResult {
  const { storage_location, is_opened, expiry_date } = item
  if (storage_location === 'Freezer') {
    return warn('Not recommended — freezing is not advised for most condiments and sauces. Store it in the fridge or pantry instead.')
  }
  if (!is_opened) return ok(expiry_date)
  const days = storage_location === 'Fridge' ? 30 : 14 // Pantry
  return ok(addDays(openedAnchor(item), days))
}

function evalSnacks(item: AdjustedExpiryInput): AdjustedExpiryResult {
  // Reuses the algorithm's "Dry Goods" rules — see decisions.md.
  const { storage_location, is_opened, expiry_date } = item
  if (storage_location === 'Freezer') return ok(addDays(expiry_date, 180))
  if (storage_location === 'Fridge') return ok(expiry_date)
  // Pantry — anchored on the printed date even when opened, per the
  // algorithm's Dry Goods wording ("Printed expiry date − 30 days"), unlike
  // most other opened-item rules which anchor on date_opened.
  if (!is_opened) return ok(expiry_date)
  return ok(addDays(expiry_date, -30))
}

function evalBakery(item: AdjustedExpiryInput): AdjustedExpiryResult {
  const { storage_location, is_opened, expiry_date } = item
  if (storage_location === 'Fridge') return ok(addDays(expiry_date, 3))
  if (storage_location === 'Freezer') {
    const anchor = is_opened ? openedAnchor(item) : expiry_date
    return ok(addDays(anchor, 90))
  }
  // Pantry
  if (!is_opened) return ok(expiry_date)
  return ok(addDays(expiry_date, -2))
}

function evalFrozen(item: AdjustedExpiryInput): AdjustedExpiryResult {
  // New category, not in the original algorithm doc — see decisions.md,
  // "Category/algorithm reconciliation" (18/8/26). Pre-frozen, store-bought
  // food: the printed date is already calibrated for freezer storage.
  const { storage_location, is_opened, expiry_date } = item
  if (storage_location !== 'Freezer') {
    return warn('Unsafe — this item is meant to stay frozen and will spoil quickly outside the freezer. Store it in the freezer instead.')
  }
  if (!is_opened) return ok(expiry_date)
  return ok(earlierOf(expiry_date, addDays(openedAnchor(item), 14)))
}

function evalMicrowaveMeals(item: AdjustedExpiryInput): AdjustedExpiryResult {
  // New category (Feedback Sprint 2, 22/8/26; renamed from "Frozen Meals"
  // to "Microwave Meals" the same sprint, before any other naming had a
  // chance to spread — see docs/decisions.md) — frozen/microwavable ready
  // meals, split out from the plain "Frozen" category above. A ready meal
  // is meant to be cooked once and eaten, not thawed and used like a raw
  // ingredient, so once it's opened/reheated it behaves like a cooked
  // leftover (short fridge life, shouldn't go back in the freezer) rather
  // than "still frozen, just needs longer to use up" like evalFrozen's
  // 14-day opened window. See docs/decisions.md.
  const { storage_location, is_opened, expiry_date } = item

  if (!is_opened) {
    if (storage_location !== 'Freezer') {
      return warn('Unsafe — this meal is meant to stay frozen until cooked and will spoil quickly outside the freezer. Store it in the freezer instead.')
    }
    return ok(expiry_date)
  }

  // Opened/reheated — from here it's a leftover, not a frozen item.
  if (storage_location === 'Freezer') {
    return warn('Unsafe — an opened meal should be refrigerated, not left in the freezer. Store it in the fridge instead.')
  }
  if (storage_location === 'Pantry') {
    return warn('Unsafe — an opened meal should not be stored in the pantry. Store it in the fridge instead.')
  }
  return ok(addDays(openedAnchor(item), 3))
}

// --- entry point ---------------------------------------------------------

export function getAdjustedExpiry(item: AdjustedExpiryInput): AdjustedExpiryResult {
  switch (item.category) {
    case 'Dairy':
      return evalDairy(item)
    case 'Meat':
      return evalMeatOrSeafood(item, 'Meat', 270, 120)
    case 'Seafood':
      return evalMeatOrSeafood(item, 'Seafood', 180, 90)
    case 'Eggs':
      return evalEggs(item)
    case 'Produce':
      return evalProduce(item)
    case 'Leftovers':
      return evalLeftovers(item)
    case 'Beverages':
      return evalBeverages(item)
    case 'Condiments':
      return evalCondiments(item)
    case 'Snacks':
      return evalSnacks(item)
    case 'Bakery':
      return evalBakery(item)
    case 'Frozen':
      return evalFrozen(item)
    case 'Microwave Meals':
      return evalMicrowaveMeals(item)
  }
}

/** Whole days between today and the adjusted date (negative once expired). */
export function getDaysRemaining(adjustedDate: string): number {
  const target = parseDate(adjustedDate)
  const today = parseDate(todayLocal())
  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function getExpiryStatus(daysRemaining: number): ExpiryStatus {
  if (daysRemaining < 0) return 'expired'
  if (daysRemaining <= 7) return 'soon'
  return 'fresh'
}
