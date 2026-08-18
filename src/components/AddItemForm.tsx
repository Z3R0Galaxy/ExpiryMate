import { useState } from 'react'
import type { FoodCategory, ItemInput, StorageLocation } from '../hooks/useItems'
import { validateItemForm } from '../lib/validateItem'

const CATEGORIES: FoodCategory[] = [
  'Dairy', 'Eggs', 'Meat', 'Seafood', 'Produce', 'Bakery',
  'Frozen', 'Beverages', 'Condiments', 'Snacks', 'Leftovers',
]

const STORAGE_LOCATIONS: StorageLocation[] = ['Fridge', 'Freezer', 'Pantry']

const today = () => new Date().toISOString().slice(0, 10)

interface Props {
  onAdd: (input: ItemInput) => Promise<{ error?: string }>
}

export function AddItemForm({ onAdd }: Props) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<FoodCategory>('Produce')
  const [storageLocation, setStorageLocation] = useState<StorageLocation>('Fridge')
  const [expiryDate, setExpiryDate] = useState('')
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
      setStorageLocation('Fridge')
      setExpiryDate('')
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
          onChange={e => setName(e.target.value)}
          required
        />
      </label>

      <label className="field-label">
        Category
        <select
          value={category}
          onChange={e => setCategory(e.target.value as FoodCategory)}
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

      {/* A div, not a label — the checkbox already has its own label
          below, and a label can't validly wrap another label. */}
      <div className="field-label">
        Opened?
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={isOpened}
            onChange={e => {
              setIsOpened(e.target.checked)
              if (!e.target.checked) setDateOpened('')
            }}
          />
          {isOpened ? 'Yes' : 'No'}
        </label>
      </div>

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
