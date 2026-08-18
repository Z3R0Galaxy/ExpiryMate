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
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const opened = new Date(values.date_opened)
    if (opened.getTime() > today.getTime()) {
      return 'Date opened cannot be in the future.'
    }
  }

  return null
}
