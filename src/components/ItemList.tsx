import { useMemo, useState } from 'react'
import type { FoodCategory, Item, ItemInput, StorageLocation } from '../hooks/useItems'
import { validateItemForm } from '../lib/validateItem'
import { getAdjustedExpiry, getDaysRemaining, getExpiryStatus } from '../lib/adjustedExpiry'
import type { ExpiryStatus } from '../lib/adjustedExpiry'

const CATEGORIES: FoodCategory[] = [
  'Dairy', 'Eggs', 'Meat', 'Seafood', 'Produce', 'Bakery',
  'Frozen', 'Beverages', 'Condiments', 'Snacks', 'Leftovers',
]

const STORAGE_LOCATIONS: StorageLocation[] = ['Fridge', 'Freezer', 'Pantry']

const today = () => new Date().toISOString().slice(0, 10)

type BadgeStatus = ExpiryStatus | 'warning'

const STATUS_LABEL: Record<BadgeStatus, string> = {
  expired: 'Expired',
  soon: 'Expiring soon',
  fresh: 'Fresh',
  warning: '⚠ Unsafe',
}

const STATUS_CLASS: Record<BadgeStatus, string> = {
  expired: 'status-expired',
  soon: 'status-soon',
  fresh: 'status-fresh',
  warning: 'status-warning',
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

interface ItemRowProps {
  item: Item
  isEditing: boolean
  edit: EditState | null
  error: string | null
  onStartEdit: (item: Item) => void
  onCancelEdit: () => void
  onSaveEdit: (id: string) => void
  onDelete: (id: string) => void
  setEdit: (edit: EditState) => void
}

function ItemRow({
  item, isEditing, edit, error, onStartEdit, onCancelEdit, onSaveEdit, onDelete, setEdit,
}: ItemRowProps) {
  // Memoised per item, keyed only on the fields the calculation actually
  // depends on — see decisions.md's marking-alignment review ("memoise the
  // adjusted-expiry calculation per item") so ItemList doesn't recompute
  // every row's adjusted date on every re-render (e.g. while another row is
  // mid-edit).
  const result = useMemo(
    () => getAdjustedExpiry({
      category: item.category,
      storage_location: item.storage_location,
      expiry_date: item.expiry_date,
      is_opened: item.is_opened,
      date_opened: item.date_opened,
    }),
    [item.category, item.storage_location, item.expiry_date, item.is_opened, item.date_opened],
  )

  const badgeStatus: BadgeStatus = result.safe ? getExpiryStatus(getDaysRemaining(result.adjustedDate)) : 'warning'
  const daysRemaining = result.safe ? getDaysRemaining(result.adjustedDate) : null

  return (
    <li className={`item-row ${STATUS_CLASS[badgeStatus]}`}>
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
          <label className="field-label">
            {edit.category === 'Leftovers' ? 'Date prepared' : 'Printed expiry date'}
            <input
              aria-label={edit.category === 'Leftovers' ? 'Date prepared' : 'Printed expiry date'}
              type="date"
              value={edit.expiry_date}
              onChange={e => setEdit({ ...edit, expiry_date: e.target.value })}
              max={edit.category === 'Leftovers' ? today() : undefined}
            />
          </label>
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
          <button onClick={() => onSaveEdit(item.id)}>Save</button>
          <button onClick={onCancelEdit}>Cancel</button>
        </div>
      ) : (
        <div className="item-view">
          <div className="item-top">
            <span className={`status-badge ${STATUS_CLASS[badgeStatus]}`}>{STATUS_LABEL[badgeStatus]}</span>
            <span className="item-name">{item.name}</span>
            <div className="item-actions">
              <button
                type="button"
                className="icon-button"
                onClick={() => onStartEdit(item)}
                aria-label={`Edit ${item.name}`}
                title="Edit"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
              <button
                type="button"
                className="icon-button icon-button-danger"
                onClick={() => onDelete(item.id)}
                aria-label={`Delete ${item.name}`}
                title="Delete"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
              </button>
            </div>
          </div>
          <dl className="item-meta">
            <div className="item-meta-row">
              <dt>Category</dt>
              <dd>{item.category}</dd>
            </div>
            <div className="item-meta-row">
              <dt>Storage</dt>
              <dd>{item.storage_location}</dd>
            </div>
            <div className="item-meta-row">
              <dt>{item.category === 'Leftovers' ? 'Prepared' : 'Expires'}</dt>
              <dd>{item.expiry_date}</dd>
            </div>
            {result.safe ? (
              <div className="item-meta-row">
                <dt>Adjusted</dt>
                <dd>{result.adjustedDate} ({daysRemaining} day{daysRemaining === 1 ? '' : 's'})</dd>
              </div>
            ) : (
              <div className="item-meta-row item-meta-warning">
                <dt>Warning</dt>
                <dd>{result.message}</dd>
              </div>
            )}
            <div className="item-meta-row">
              <dt>Qty</dt>
              <dd>{item.quantity}</dd>
            </div>
            {item.is_opened && (
              <div className="item-meta-row">
                <dt>Opened</dt>
                <dd>{item.date_opened}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </li>
  )
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
      {items.map(item => (
        <ItemRow
          key={item.id}
          item={item}
          isEditing={editingId === item.id}
          edit={edit}
          error={error}
          onStartEdit={startEdit}
          onCancelEdit={cancelEdit}
          onSaveEdit={saveEdit}
          onDelete={onDelete}
          setEdit={setEdit}
        />
      ))}
    </ul>
  )
}
