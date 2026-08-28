/**
 * Shared client-side validation for the add-item and edit-item forms.
 *
 * This exists because the security floor review (docs/05-security-review.md)
 * flagged that client-side validation was minimal — HTML5 `required` only —
 * while the real backstop was entirely database constraints. Those DB
 * constraints (quantity 1-999, date_opened required when is_opened, etc.)
 * still stand as the actual enforcement; this module just gives users a
 * readable error before a raw Postgres constraint violation reaches them.
 */

import { getAdjustedExpiry, todayLocal } from './adjustedExpiry'
import type { FoodCategory, StorageLocation } from '../hooks/useItems'

export interface ItemFormValues {
  name: string
  expiry_date: string
  quantity: string
  is_opened: boolean
  date_opened: string
}

/**
 * Re-exported from adjustedExpiry.ts, where it now lives (27/8/26).
 *
 * It was defined here first, as the fix for the "date must not be in the
 * future" bug in Feedback Sprint 2 (22/8/26): comparing a UTC-parsed date
 * against local midnight made today's own date read as a future date for
 * the first several hours of every day in any timezone ahead of UTC.
 *
 * The sweep on 27/8/26 found getDaysRemaining() in adjustedExpiry.ts had
 * never been given the same treatment and was still anchoring the whole
 * app's countdown on the UTC date. Since adjustedExpiry.ts is the lower
 * of the two modules (this file imports it, not the other way round), the
 * definition moved there and is re-exported here so the existing
 * `import { todayLocal } from '../lib/validateItem'` call sites in
 * AddItemForm.tsx and ItemDetailModal.tsx keep working unchanged.
 *
 * Every "what is today, for a date-only field" check in the app should go
 * through this one function rather than each reinventing its own - the
 * original bug happened precisely because three files each had a slightly
 * different idea of "today".
 */
export { todayLocal }

export function validateItemForm(values: ItemFormValues): string | null {
  if (!values.name.trim()) {
    return 'Item name is required.'
  }

  if (!values.expiry_date) {
    return 'Printed expiry date is required.'
  }

  const quantity = Number(values.quantity)
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
    return 'Quantity must be a whole number between 1 and 999.'
  }

  if (values.is_opened) {
    if (!values.date_opened) {
      return 'Date opened is required when the item is marked as opened.'
    }
    // Plain string comparison — both sides are `YYYY-MM-DD`, which sorts
    // identically to calendar order, and avoids ever constructing a `Date`
    // from a date-only string (the source of the UTC/local mismatch above).
    if (values.date_opened > todayLocal()) {
      return 'Date opened cannot be in the future.'
    }
  }

  return null
}

export interface StorageSafetyInput {
  category: FoodCategory
  storage_location: StorageLocation
  expiry_date: string
  is_opened: boolean
  date_opened: string | null
}

/**
 * Feedback Sprint 2 (22/8/26): previously the app would let you add or edit
 * an item into a storage location the algorithm itself classifies as unsafe
 * (e.g. raw meat in the pantry) — it would save fine and just show up on
 * the dashboard/list with an "Unsafe" badge afterwards. Per the user's
 * explicit request, that's now checked at save time instead: this runs the
 * exact same `getAdjustedExpiry` the rest of the app uses for the "Unsafe"
 * badge, and returns its warning message (which now always names the
 * correct storage location — see adjustedExpiry.ts) when the combination
 * of category/storage/opened isn't safe, so the caller can block the save
 * and show the user where the item actually belongs. Returns null when
 * the combination is safe. Shared by both AddItemForm.tsx and
 * useItemDetail.ts's saveEdit so add and edit enforce the same rule.
 */
export function checkStorageSafety(values: StorageSafetyInput): string | null {
  const result = getAdjustedExpiry(values)
  return result.safe ? null : result.message
}
