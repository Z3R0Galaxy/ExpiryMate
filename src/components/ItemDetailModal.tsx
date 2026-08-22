import { useState } from 'react'
import type { FoodCategory, Item, StorageLocation } from '../hooks/useItems'
import { AnimatedModal } from './AnimatedModal'
import { computeStatusInfo, STATUS_CLASS, STATUS_LABEL } from '../lib/itemStatus'
import type { BadgeStatus } from '../lib/itemStatus'
import { STORAGE_LOCATIONS } from '../lib/dashboardStats'
import { todayLocal } from '../lib/validateItem'
import { CategoryIcon } from './icons'

// Pulled out of ItemList.tsx (UI feedback pass four, 21/8/26) so the same
// "click an item to see the full expanded view" behaviour can be reused
// from AttentionPanel's rows (Dashboard/PlaceDashboard), not just
// ItemList's own cards/table rows — see useItemDetail.ts, the paired hook
// that owns the open/edit/delete state this component is driven by.

const CATEGORIES: FoodCategory[] = [
  'Dairy', 'Eggs', 'Meat', 'Seafood', 'Produce', 'Bakery',
  'Frozen', 'Microwave Meals', 'Beverages', 'Condiments', 'Snacks', 'Leftovers',
]

// See validateItem.ts's todayLocal() — this used to be its own
// `new Date().toISOString().slice(0, 10)` (UTC calendar date, not local),
// which is what caused the "date must not be in the future" bug on today's
// own date. Kept as a local alias so every call site below (`today()`)
// stays unchanged.
const today = todayLocal

export interface EditState {
  name: string
  category: FoodCategory
  storage_location: StorageLocation
  expiry_date: string
  quantity: string
  is_opened: boolean
  date_opened: string
}

// --- shared hero (status badge + big countdown) --------------------------

export function CardHero({ badgeStatus, countdownValue, countdownLabel, warningMessage, size }: {
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
          <span className="item-countdown-text">{size === 'modal' ? warningMessage : STATUS_LABEL[badgeStatus]}</span>
        </span>
      )}
    </div>
  )
}

// --- expanded modal ---------------------------------------------------

export interface ItemDetailModalProps {
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
  onDelete: (id: string) => Promise<string | undefined>
  setEdit: (edit: EditState) => void
}

export function ItemDetailModal({
  item, visible, origin, isEditing, edit, error,
  onClose, onStartEdit, onCancelEdit, onSaveEdit, onDelete, setEdit,
}: ItemDetailModalProps) {
  const { result, badgeStatus, countdownValue, countdownLabel } = computeStatusInfo(item)

  // Deletion is destructive and irreversible, so clicking the Delete icon
  // only arms a confirmation step inside the modal rather than deleting
  // immediately — the actual delete only happens once the user confirms.
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function armDelete() {
    setDeleteError(null)
    setConfirmingDelete(true)
  }

  function cancelDelete() {
    setDeleteError(null)
    setConfirmingDelete(false)
  }

  async function confirmDelete() {
    const err = await onDelete(item.id)
    if (err) setDeleteError(err)
  }

  return (
    <AnimatedModal visible={visible} origin={origin} onClose={onClose}>
      <div className="item-modal-header">
        <div className="item-modal-header-actions">
          {!isEditing && !confirmingDelete && (
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
                onClick={armDelete}
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
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close" title="Close">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {confirmingDelete ? (
        <div className="delete-confirm">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="delete-confirm-icon">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
          <p className="delete-confirm-text">Delete <strong>{item.name}</strong>? This can't be undone.</p>
          {deleteError && <p className="error">{deleteError}</p>}
          <div className="delete-confirm-actions">
            <button type="button" className="button-secondary" onClick={cancelDelete}>Cancel</button>
            <button type="button" className="button-danger" onClick={confirmDelete}>Delete</button>
          </div>
        </div>
      ) : isEditing && edit ? (
        <div className="item-edit">
          <label className="field-label">
            Item name
            <input
              value={edit.name}
              onChange={e => setEdit({ ...edit, name: e.target.value })}
            />
          </label>
          <label className="field-label">
            Category
            <select
              value={edit.category}
              onChange={e => setEdit({ ...edit, category: e.target.value as FoodCategory })}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="field-label">
            Storage location
            <select
              value={edit.storage_location}
              onChange={e => setEdit({ ...edit, storage_location: e.target.value as StorageLocation })}
            >
              {STORAGE_LOCATIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="field-label">
            {edit.category === 'Leftovers' ? 'Date prepared' : 'Printed expiry date'}
            <input
              type="date"
              value={edit.expiry_date}
              onChange={e => setEdit({ ...edit, expiry_date: e.target.value })}
              max={edit.category === 'Leftovers' ? today() : undefined}
            />
          </label>
          <label className="field-label">
            Quantity
            <input
              type="number"
              min={1}
              max={999}
              value={edit.quantity}
              onChange={e => setEdit({ ...edit, quantity: e.target.value })}
            />
          </label>
          {/* Matches AddItemForm.tsx's opened-toggle layout (Feedback
           * Sprint 2, 22/8/26) — kept the same here rather than letting
           * add and edit drift into two different layouts for the same
           * field. */}
          <label className="opened-toggle">
            <span>Opened?</span>
            <input
              type="checkbox"
              checked={edit.is_opened}
              onChange={e => setEdit({
                ...edit,
                is_opened: e.target.checked,
                date_opened: e.target.checked ? edit.date_opened : '',
              })}
            />
          </label>
          {edit.is_opened && (
            <label className="field-label">
              Date opened
              <input
                type="date"
                value={edit.date_opened}
                onChange={e => setEdit({ ...edit, date_opened: e.target.value })}
                max={today()}
              />
            </label>
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
          <h2 className="item-modal-name">
            <CategoryIcon category={item.category} size={20} />
            {item.name}
          </h2>

          <dl className="item-stat-grid">
            <div className="item-stat-tile">
              <dt>Category</dt>
              <dd className="item-stat-value-icon">
                <CategoryIcon category={item.category} size={14} />
                {item.category}
              </dd>
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
    </AnimatedModal>
  )
}
