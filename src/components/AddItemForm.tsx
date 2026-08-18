import { useState } from 'react'
import type { FoodCategory, ItemInput, StorageLocation } from '../hooks/useItems'
import { validateItemForm } from '../lib/validateItem'

const CATEGORIES: FoodCategory[] = [
  'Dairy', 'Meat', 'Seafood', 'Produce', 'Bakery',
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
      <input
        type="text"
        placeholder="Item name (e.g. Milk)"
        value={name}
        onChange={e => setName(e.target.value)}
        required
      />

      <select
        aria-label="Category"
        value={category}
        onChange={e => setCategory(e.target.value as FoodCategory)}
      >
        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      <select
        aria-label="Storage location"
        value={storageLocation}
        onChange={e => setStorageLocation(e.target.value as StorageLocation)}
      >
        {STORAGE_LOCATIONS.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <input
        aria-label="Printed expiry date"
        type="date"
        value={expiryDate}
        onChange={e => setExpiryDate(e.target.value)}
        required
      />

      <input
        aria-label="Quantity"
        type="number"
        min={1}
        max={999}
        value={quantity}
        onChange={e => setQuantity(e.target.value)}
        required
      />

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={isOpened}
          onChange={e => {
            setIsOpened(e.target.checked)
            if (!e.target.checked) setDateOpened('')
          }}
        />
        Opened
      </label>

      {isOpened && (
        <input
          aria-label="Date opened"
          type="date"
          value={dateOpened}
          onChange={e => setDateOpened(e.target.value)}
          max={today()}
          required
        />
      )}

      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Adding...' : 'Add Item'}
      </button>
    </form>
  )
}
