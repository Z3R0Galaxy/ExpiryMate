import { useState } from 'react'
import type { FoodCategory, Item, ItemInput, StorageLocation } from '../hooks/useItems'
import { validateItemForm } from '../lib/validateItem'

const CATEGORIES: FoodCategory[] = [
  'Dairy', 'Meat', 'Seafood', 'Produce', 'Bakery',
  'Frozen', 'Beverages', 'Condiments', 'Snacks', 'Leftovers',
]

const STORAGE_LOCATIONS: StorageLocation[] = ['Fridge', 'Freezer', 'Pantry']

const today = () => new Date().toISOString().slice(0, 10)

type Status = 'expired' | 'soon' | 'fresh'

// Printed-date status for now — Slice 3 switches this to the adjusted date.
function getStatus(expiryDate: string): Status {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  const daysLeft = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysLeft < 0) return 'expired'
  if (daysLeft <= 7) return 'soon'
  return 'fresh'
}

const STATUS_LABEL: Record<Status, string> = {
  expired: 'Expired',
  soon: 'Expiring soon',
  fresh: 'Fresh',
}

const STATUS_CLASS: Record<Status, string> = {
  expired: 'status-expired',
  soon: 'status-soon',
  fresh: 'status-fresh',
}

interface EditState {
  name: string
  category: FoodCategory
  storage_location: StorageLocation
  expiry_date: string
  quantity: string
  is_opened: boolean
  date_opened: string
}

interface Props {
  items: Item[]
  loading: boolean
  onUpdate: (id: string, input: ItemInput) => Promise<{ error?: string }>
  onDelete: (id: string) => Promise<{ error?: string }>
}

export function ItemList({ items, loading, onUpdate, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [error, setError] = useState<string | null>(null)

  function startEdit(item: Item) {
    setEditingId(item.id)
    setError(null)
    setEdit({
      name: item.name,
      category: item.category,
      storage_location: item.storage_location,
      expiry_date: item.expiry_date,
      quantity: String(item.quantity),
      is_opened: item.is_opened,
      date_opened: item.date_opened ?? '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEdit(null)
    setError(null)
  }

  async function saveEdit(id: string) {
    if (!edit) return

    const validationError = validateItemForm(edit)
    if (validationError) {
      setError(validationError)
      return
    }

    const { error: updateError } = await onUpdate(id, {
      name: edit.name.trim(),
      category: edit.category,
      storage_location: edit.storage_location,
      expiry_date: edit.expiry_date,
      quantity: Number(edit.quantity),
      is_opened: edit.is_opened,
      date_opened: edit.is_opened ? edit.date_opened : null,
    })

    if (updateError) {
      setError(updateError)
    } else {
      cancelEdit()
    }
  }

  if (loading) return <p>Loading items...</p>
  if (items.length === 0) return <p className="empty">No items yet. Add one above!</p>

  return (
    <ul className="item-list">
      {items.map(item => {
        const status = getStatus(item.expiry_date)
        const isEditing = editingId === item.id

        return (
          <li key={item.id} className={`item-row ${STATUS_CLASS[status]}`}>
            {isEditing && edit ? (
              <div className="item-edit">
                <input
                  aria-label="Item name"
                  value={edit.name}
                  onChange={e => setEdit({ ...edit, name: e.target.value })}
                />
                <select
                  aria-label="Category"
                  value={edit.category}
                  onChange={e => setEdit({ ...edit, category: e.target.value as FoodCategory })}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  aria-label="Storage location"
                  value={edit.storage_location}
                  onChange={e => setEdit({ ...edit, storage_location: e.target.value as StorageLocation })}
                >
                  {STORAGE_LOCATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input
                  aria-label="Printed expiry date"
                  type="date"
                  value={edit.expiry_date}
                  onChange={e => setEdit({ ...edit, expiry_date: e.target.value })}
                />
                <input
                  aria-label="Quantity"
                  type="number"
                  min={1}
                  max={999}
                  value={edit.quantity}
                  onChange={e => setEdit({ ...edit, quantity: e.target.value })}
                />
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={edit.is_opened}
                    onChange={e => setEdit({
                      ...edit,
                      is_opened: e.target.checked,
                      date_opened: e.target.checked ? edit.date_opened : '',
                    })}
                  />
                  Opened
                </label>
                {edit.is_opened && (
                  <input
                    aria-label="Date opened"
                    type="date"
                    value={edit.date_opened}
                    onChange={e => setEdit({ ...edit, date_opened: e.target.value })}
                    max={today()}
                  />
                )}
                {error && <p className="error">{error}</p>}
                <button onClick={() => saveEdit(item.id)}>Save</button>
                <button onClick={cancelEdit}>Cancel</button>
              </div>
            ) : (
              <div className="item-view">
                <span className={`status-badge ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>
                <span className="item-name">{item.name}</span>
                <span className="item-category">{item.category}</span>
                <span className="item-storage">{item.storage_location}</span>
                <span className="item-date">expires {item.expiry_date}</span>
                <span className="item-quantity">qty {item.quantity}</span>
                {item.is_opened && <span className="item-opened">opened {item.date_opened}</span>}
                <button onClick={() => startEdit(item)}>Edit</button>
                <button onClick={() => onDelete(item.id)}>Delete</button>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
