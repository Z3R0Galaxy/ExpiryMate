import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { FoodCategory, Item, ItemInput, StorageLocation } from '../hooks/useItems'
import { validateItemForm } from '../lib/validateItem'
import { getAdjustedExpiry, getDaysRemaining, getExpiryStatus } from '../lib/adjustedExpiry'
import type { AdjustedExpiryResult, ExpiryStatus } from '../lib/adjustedExpiry'

const CATEGORIES: FoodCategory[] = [
  'Dairy', 'Eggs', 'Meat', 'Seafood', 'Produce', 'Bakery',
  'Frozen', 'Beverages', 'Condiments', 'Snacks', 'Leftovers',
]

const STORAGE_LOCATIONS: StorageLocation[] = ['Fridge', 'Freezer', 'Pantry']

const today = () => new Date().toISOString().slice(0, 10)

// How long the open/close transform transition takes — kept as one constant
// so the JS timeout that finally unmounts the modal (closeItem below) can't
// drift out of sync with the CSS transition duration it's waiting on.
const MODAL_TRANSITION_MS = 220

type BadgeStatus = ExpiryStatus | 'warning'

const STATUS_LABEL: Record<BadgeStatus, string> = {
  expired: 'Expired',
  soon: 'Expiring soon',
  fresh: 'Fresh',
  warning: 'Unsafe',
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

/** Shared by the collapsed card and the expanded modal so the "hero" status
 * area (badge + countdown or warning) looks and behaves identically in
 * both places — just larger in the modal. */
function useCardStatus(item: Item) {
  // Memoised per item, keyed only on the fields the calculation actually
  // depends on — see decisions.md's marking-alignment review ("memoise the
  // adjusted-expiry calculation per item").
  const result = useMemo<AdjustedExpiryResult>(
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
  const isPast = daysRemaining !== null && daysRemaining < 0
  const countdownValue = daysRemaining === null ? null : Math.abs(daysRemaining)
  const countdownLabel = daysRemaining === null
    ? null
    : `day${countdownValue === 1 ? '' : 's'} ${isPast ? 'ago' : 'left'}`

  return { result, badgeStatus, countdownValue, countdownLabel }
}

function CardHero({ badgeStatus, countdownValue, countdownLabel, warningMessage, size }: {
  badgeStatus: BadgeStatus
  countdownValue: number | null
  countdownLabel: string | null
  warningMessage: string | null
  size: 'card' | 'modal'
}) {
  return (
    <div className={`item-hero item-hero-${size}`}>
      <span className={`status-badge ${STATUS_CLASS[badgeStatus]}`}>{STATUS_LABEL[badgeStatus]}</span>
      {countdownValue !== null ? (
        <span className="item-countdown">
          <span className="item-countdown-number">{countdownValue}</span>
          <span className="item-countdown-label">{countdownLabel}</span>
        </span>
      ) : (
        <span className="item-countdown item-countdown-warning">
          {/* Collapsed card: repeat the same short warning label the badge
           * already shows, just larger, in the spot the countdown number
           * would otherwise occupy — no numeric countdown exists for an
           * unsafe/not-recommended combination. Modal: room for the full
           * explanation instead. */}
          <span className="item-countdown-text">{size === 'modal' ? warningMessage : STATUS_LABEL[badgeStatus]}</span>
        </span>
      )}
    </div>
  )
}

// --- collapsed card -------------------------------------------------

interface ItemCardProps {
  item: Item
  onOpen: (item: Item, sourceEl: HTMLElement) => void
}

function ItemCard({ item, onOpen }: ItemCardProps) {
  const { badgeStatus, countdownValue, countdownLabel } = useCardStatus(item)

  return (
    <li>
      <button
        type="button"
        className={`item-card ${STATUS_CLASS[badgeStatus]}`}
        onClick={e => onOpen(item, e.currentTarget)}
      >
        <CardHero
          badgeStatus={badgeStatus}
          countdownValue={countdownValue}
          countdownLabel={countdownLabel}
          warningMessage={null}
          size="card"
        />
        <span className="item-card-name">{item.name}</span>
      </button>
    </li>
  )
}

// --- expanded modal ---------------------------------------------------

interface ItemDetailModalProps {
  item: Item
  visible: boolean
  origin: { x: number; y: number }
  isEditing: boolean
  edit: EditState | null
  error: string | null
  onClose: () => void
  onStartEdit: (item: Item) => void
  onCancelEdit: () => void
  onSaveEdit: (id: string) => void
  onDelete: (id: string) => void
  setEdit: (edit: EditState) => void
}

function ItemDetailModal({
  item, visible, origin, isEditing, edit, error,
  onClose, onStartEdit, onCancelEdit, onSaveEdit, onDelete, setEdit,
}: ItemDetailModalProps) {
  const { result, badgeStatus, countdownValue, countdownLabel } = useCardStatus(item)

  // Close on Escape, and stop the page scrolling behind the modal while
  // it's open — both restored/removed on close via the effect cleanup.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  // "Grows from where you clicked" effect: while not yet visible (opening)
  // or no longer visible (closing), pin the card to a transform that
  // matches the collapsed card's on-screen position and a small scale: —
  // once `visible` flips true, this inline style is removed and the
  // card's own CSS transition animates it to its default (centred,
  // full-size) position. Toggling `visible` back to false for closing
  // re-applies the same transform, so it animates back to where it opened
  // from, rather than just disappearing.
  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2
  const style = visible
    ? undefined
    : { transform: `translate(${origin.x - centerX}px, ${origin.y - centerY}px) scale(0.3)`, opacity: 0 }

  return createPortal(
    <div
      className={`item-modal-backdrop ${visible ? 'item-modal-visible' : ''}`}
      onClick={onClose}
    >
      <div className="item-modal" style={style} onClick={e => e.stopPropagation()}>
        <div className="item-modal-header">
          <div className="item-modal-header-actions">
            {!isEditing && (
              <>
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
              </>
            )}
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

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
          <>
            <CardHero
              badgeStatus={badgeStatus}
              countdownValue={countdownValue}
              countdownLabel={countdownLabel}
              warningMessage={result.safe ? null : result.message}
              size="modal"
            />
            <h2 className="item-modal-name">{item.name}</h2>

            <dl className="item-stat-grid">
              <div className="item-stat-tile">
                <dt>Category</dt>
                <dd>{item.category}</dd>
              </div>
              <div className="item-stat-tile">
                <dt>Storage</dt>
                <dd>{item.storage_location}</dd>
              </div>
              <div className="item-stat-tile">
                <dt>{item.category === 'Leftovers' ? 'Prepared' : 'Expires'}</dt>
                <dd>{item.expiry_date}</dd>
              </div>
              <div className="item-stat-tile">
                <dt>Qty</dt>
                <dd>{item.quantity}</dd>
              </div>
              {result.safe && (
                <div className="item-stat-tile">
                  <dt>Adjusted</dt>
                  <dd>{result.adjustedDate}</dd>
                </div>
              )}
              {item.is_opened && (
                <div className="item-stat-tile">
                  <dt>Opened</dt>
                  <dd>{item.date_opened}</dd>
                </div>
              )}
            </dl>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

// --- list ---------------------------------------------------------------

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

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [origin, setOrigin] = useState({ x: 0, y: 0 })
  const [modalVisible, setModalVisible] = useState(false)

  function openItem(item: Item, sourceEl: HTMLElement) {
    const rect = sourceEl.getBoundingClientRect()
    setOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
    setExpandedId(item.id)
    // Flip to visible a frame after mounting with the "at the source card"
    // transform already applied, so the transition has something to
    // animate from rather than jumping straight to centred.
    requestAnimationFrame(() => setModalVisible(true))
  }

  function closeItem() {
    setModalVisible(false)
    setEditingId(null)
    setEdit(null)
    setError(null)
    window.setTimeout(() => setExpandedId(null), MODAL_TRANSITION_MS)
  }

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

  async function handleDelete(id: string) {
    const { error: deleteError } = await onDelete(id)
    if (!deleteError && expandedId === id) {
      closeItem()
    }
  }

  if (loading) return <p>Loading items...</p>
  if (items.length === 0) return <p className="empty">No items yet. Add one above!</p>

  // Re-derived from `items` on every render (rather than cached at open
  // time) so an edit/save while expanded is reflected immediately, and a
  // delete of the expanded item just makes this null rather than showing
  // stale data.
  const expandedItem = items.find(i => i.id === expandedId) ?? null

  return (
    <>
      <ul className="item-list">
        {items.map(item => (
          <ItemCard key={item.id} item={item} onOpen={openItem} />
        ))}
      </ul>
      {expandedItem && (
        <ItemDetailModal
          item={expandedItem}
          visible={modalVisible}
          origin={origin}
          isEditing={editingId === expandedItem.id}
          edit={edit}
          error={error}
          onClose={closeItem}
          onStartEdit={startEdit}
          onCancelEdit={cancelEdit}
          onSaveEdit={saveEdit}
          onDelete={handleDelete}
          setEdit={setEdit}
        />
      )}
    </>
  )
}
