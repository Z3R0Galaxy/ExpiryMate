import { useState } from 'react'
import type { FoodCategory, ItemInput, StorageLocation } from '../hooks/useItems'
import { validateItemForm, checkStorageSafety, todayLocal } from '../lib/validateItem'
import { guessCategory } from '../lib/guessCategory'

const CATEGORIES: FoodCategory[] = [
  'Dairy', 'Eggs', 'Meat', 'Seafood', 'Produce', 'Bakery',
  'Frozen', 'Frozen Meals', 'Beverages', 'Condiments', 'Snacks', 'Leftovers',
]

const STORAGE_LOCATIONS: StorageLocation[] = ['Fridge', 'Freezer', 'Pantry']

// Was its own `new Date().toISOString().slice(0, 10)` (UTC calendar date,
// not local) — switched to the shared `todayLocal()` alongside the
// validateItem.ts fix for the "date must not be in the future" bug, so the
// date-input's own `max` attribute agrees with the validation message
// instead of using a different definition of "today." See validateItem.ts.
const today = todayLocal

interface Props {
  onAdd: (input: ItemInput) => Promise<{ error?: string }>
}

export function AddItemForm({ onAdd }: Props) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<FoodCategory>('Produce')
  // Tracks whether the user has manually picked a category themselves —
  // once they have, the name-based guess (below) stops overriding their
  // choice for the rest of this form session. Resets on a successful add,
  // same as every other field.
  const [categoryTouched, setCategoryTouched] = useState(false)
  const [storageLocation, setStorageLocation] = useState<StorageLocation>('Fridge')
  // Defaults to today rather than blank (Slice 6) — most items use the
  // current year anyway, so this saves typing the common case while
  // leaving every part of the date still fully editable.
  const [expiryDate, setExpiryDate] = useState(() => today())
  const [quantity, setQuantity] = useState('1')
  const [isOpened, setIsOpened] = useState(false)
  const [dateOpened, setDateOpened] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Leftovers have no printed label to read a date from — the algorithm in
  // decisions.md uses the date the food was prepared instead, so the form
  // needs to make that switch obvious rather than silently reusing the same
  // field under a misleading label.
  const isLeftovers = category === 'Leftovers'
  const dateFieldLabel = isLeftovers ? 'Date prepared' : 'Printed expiry date'

  // Slice 6 nice-to-have: guess the category as the user types the name,
  // via a plain keyword lookup (no AI/network call — see
  // src/lib/guessCategory.ts). Only applies while the user hasn't picked a
  // category themselves yet, and only overrides when there's an actual
  // guess — no match leaves the current selection untouched rather than
  // resetting it to a default.
  function handleNameChange(value: string) {
    setName(value)
    if (!categoryTouched) {
      const guess = guessCategory(value)
      if (guess) setCategory(guess)
    }
  }

  function handleCategoryChange(value: FoodCategory) {
    setCategory(value)
    setCategoryTouched(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const validationError = validateItemForm({
      name,
      expiry_date: expiryDate,
      quantity,
      is_opened: isOpened,
      date_opened: dateOpened,
    })
    if (validationError) {
      setError(validationError)
      return
    }

    // Blocks adding an item classified unsafe in its current storage spot
    // (Feedback Sprint 2, 22/8/26) — the message names the correct
    // location, and the item isn't added until it's moved there or the
    // storage/category/opened selection changes to a safe one.
    const safetyError = checkStorageSafety({
      category,
      storage_location: storageLocation,
      expiry_date: expiryDate,
      is_opened: isOpened,
      date_opened: isOpened ? dateOpened : null,
    })
    if (safetyError) {
      setError(safetyError)
      return
    }

    setLoading(true)
    const { error: submitError } = await onAdd({
      name: name.trim(),
      category,
      storage_location: storageLocation,
      expiry_date: expiryDate,
      quantity: Number(quantity),
      is_opened: isOpened,
      date_opened: isOpened ? dateOpened : null,
    })

    if (submitError) {
      setError(submitError)
    } else {
      setName('')
      setCategory('Produce')
      setCategoryTouched(false)
      setStorageLocation('Fridge')
      setExpiryDate(today())
      setQuantity('1')
      setIsOpened(false)
      setDateOpened('')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="add-item-form">
      <label className="field-label">
        Item name
        <input
          type="text"
          placeholder="e.g. Milk"
          value={name}
          onChange={e => handleNameChange(e.target.value)}
          required
        />
      </label>

      <label className="field-label">
        Category
        <select
          value={category}
          onChange={e => handleCategoryChange(e.target.value as FoodCategory)}
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>

      <label className="field-label">
        Storage location
        <select
          value={storageLocation}
          onChange={e => setStorageLocation(e.target.value as StorageLocation)}
        >
          {STORAGE_LOCATIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

      <label className="field-label">
        {dateFieldLabel}
        <input
          aria-label={dateFieldLabel}
          type="date"
          value={expiryDate}
          onChange={e => setExpiryDate(e.target.value)}
          max={isLeftovers ? today() : undefined}
          required
        />
      </label>

      <label className="field-label">
        Quantity
        <input
          type="number"
          min={1}
          max={999}
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          required
        />
      </label>

      {/* Feedback Sprint 2 (22/8/26): was a stacked field-label ("Opened?"
       * on its own line above a separate Yes/No checkbox row, matching
       * every other field's vertical layout) — now a single row with the
       * question and its checkbox side by side, per the user's explicit
       * request. Checking it is what reveals the date field below. */}
      <label className="opened-toggle">
        <span>Opened?</span>
        <input
          type="checkbox"
          checked={isOpened}
          onChange={e => {
            setIsOpened(e.target.checked)
            if (!e.target.checked) setDateOpened('')
          }}
        />
      </label>

      {isOpened && (
        <label className="field-label">
          Date opened
          <input
            aria-label="Date opened"
            type="date"
            value={dateOpened}
            onChange={e => setDateOpened(e.target.value)}
            max={today()}
            required
          />
        </label>
      )}

      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Adding...' : 'Add Item'}
      </button>
    </form>
  )
}
