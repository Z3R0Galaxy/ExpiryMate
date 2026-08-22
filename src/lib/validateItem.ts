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

export interface ItemFormValues {
  name: string
  expiry_date: string
  quantity: string
  is_opened: boolean
  date_opened: string
}

/**
 * Today's date, in the user's own local timezone, as a `YYYY-MM-DD` string —
 * i.e. exactly the calendar date a `<input type="date">` picker shows and
 * expects. Deliberately NOT `new Date().toISOString().slice(0, 10)`, which
 * reads UTC's calendar date instead of the local one: for any timezone
 * ahead of UTC (e.g. Australia/Sydney, UTC+10) that UTC date lags behind
 * the real local date for the first several hours of every day. That
 * mismatch — comparing a UTC-parsed date against a local-midnight
 * `Date` — is exactly what caused "date must not be in the future" to
 * fire when a user picked today's own date (Feedback Sprint 2, 22/8/26;
 * see docs/decisions.md). Every "what's today, for a date-only field"
 * check in the app should go through this one function rather than each
 * reinventing its own — the previous bug happened because AddItemForm.tsx,
 * ItemDetailModal.tsx, and this file each had their own slightly different
 * idea of "today."
 */
export function todayLocal(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

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
